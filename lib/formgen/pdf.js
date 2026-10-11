// AcroForm filling on top of pdf-lib, with a per-field report (field, item, label, value, source).
const { PDFDocument, PDFName, PDFString, PDFHexString, PDFTextField, PDFCheckBox, PDFButton, PDFDropdown, PDFRadioGroup, StandardFonts, rgb, degrees } = require('pdf-lib');

function tooltip(field) {
  const tu = field.acroField.dict.get(PDFName.of('TU'));
  if (!tu) return '';
  if (tu instanceof PDFString || tu instanceof PDFHexString) return tu.decodeText().trim();
  return String(tu).trim();
}

class Filler {
  constructor(pdfDoc, formId) {
    this.doc = pdfDoc;
    this.formId = formId;
    this.form = pdfDoc.getForm(); // pdf-lib removes the XFA layer here, so Acrobat shows these AcroForm values
    this.rows = new Map();
    this.byName = new Map(this.form.getFields().map((f) => [f.getName(), f]));
  }
  field(name) {
    const f = this.byName.get(name);
    if (!f) throw new Error(`${this.formId}: no field ${name}`);
    return f;
  }
  // find a field by a name suffix (unique) e.g. 'AttyName_ft[0]'
  find(suffix, { all = false } = {}) {
    const hits = [...this.byName.keys()].filter((n) => n.endsWith(suffix));
    return all ? hits : hits[0];
  }
  _row(name, value, meta) {
    const prev = this.rows.get(name) || {};
    this.rows.set(name, { field: name, item: meta.item || prev.item || '', label: meta.label || prev.label || tooltip(this.field(name)), value, source: meta.source || '' });
  }
  // value: string | number | {value, source} | undefined. Undefined leaves the field blank and
  // records why (meta.need = fact key).
  text(name, v, meta = {}) {
    const f = this.field(name);
    let value = v; let source = meta.source;
    if (v && typeof v === 'object' && 'value' in v) { value = v.value; source = source || v.source; }
    if (value === undefined || value === null || value === '') {
      this._row(name, '', { ...meta, source: meta.need ? `NEEDS ANSWER: ${meta.need}` : (meta.blankReason || 'left blank') });
      return;
    }
    value = String(value);
    if (f instanceof PDFTextField) {
      const max = f.getMaxLength();
      if (max && value.length > max) value = value.slice(0, max);
      f.setText(value);
    } else if (f instanceof PDFDropdown) {
      f.select(value);
    } else throw new Error(`${this.formId}: ${name} is not a text field`);
    this._row(name, value, { ...meta, source: source || 'fixed text' });
  }
  check(name, on, meta = {}) {
    const f = this.field(name);
    if (on === undefined) { this._row(name, '', { ...meta, source: meta.need ? `NEEDS ANSWER: ${meta.need}` : 'left blank' }); return; }
    if (f instanceof PDFCheckBox) { if (on) f.check(); else f.uncheck(); }
    else if (f instanceof PDFRadioGroup) {
      if (on) {
        const opts = f.getOptions(); const key = (x) => String(x).replace(/[^A-Za-z0-9]/g, '');
        const pick = typeof on === 'string' ? (opts.find((o) => o === on) || opts.find((o) => key(o) === key(on))) : opts[0];
        if (!pick) throw new Error(`${this.formId}: ${name} has no option ${on}`);
        f.select(pick);
        this._row(name, `X: ${pick}`, { ...meta, source: meta.source || 'fixed' });
        return;
      }
    }
    else throw new Error(`${this.formId}: ${name} is not a checkbox`);
    this._row(name, on ? 'X' : '', { ...meta, source: meta.source || 'fixed' });
  }
  // A checkbox field whose widgets carry different on-states (e.g. /1 and /2 for two boxes that
  // share one field name, as on DE-260). state = the on-state name to turn on, null = all off,
  // undefined = unknown (left off and reported).
  checkState(name, state, meta = {}) {
    const f = this.field(name);
    const ctx = this.doc.context;
    const on = state === undefined || state === null ? null : String(state);
    f.acroField.dict.set(PDFName.of('V'), PDFName.of(on || 'Off'));
    for (const w of f.acroField.getWidgets()) {
      const ap = w.dict.lookup(PDFName.of('AP'));
      const n = ap && ap.lookup(PDFName.of('N'));
      const has = on && n && n.keys().some((k) => k.asString() === `/${on}`);
      w.dict.set(PDFName.of('AS'), PDFName.of(has ? on : 'Off'));
    }
    void ctx;
    this._row(name, state === undefined ? '' : (on ? ((meta.stateLabels && meta.stateLabels[on]) || on) : ''), { ...meta, source: state === undefined ? (meta.need ? `NEEDS ANSWER: ${meta.need}` : 'left blank') : (meta.source || 'fixed') });
  }

  // apply Rozsa's field edits from the editor
  applyOverrides(overrides = {}) {
    for (const [name, val] of Object.entries(overrides)) {
      const f = this.byName.get(name);
      if (!f) continue;
      if (f instanceof PDFCheckBox) { if (val === true || val === 'X' || val === 'true') f.check(); else f.uncheck(); this._row(name, val === true || val === 'X' || val === 'true' ? 'X' : '', { source: 'Attorney edit' }); }
      else if (f instanceof PDFTextField) { f.setText(String(val ?? '')); this._row(name, String(val ?? ''), { source: 'Attorney edit' }); }
      else if (f instanceof PDFRadioGroup) {
        const want = String(val ?? '').replace(/^X:\s*/, ''); const key = (x) => String(x).replace(/[^A-Za-z0-9]/g, '');
        const pick = f.getOptions().find((o) => key(o) === key(want));
        if (pick) { f.select(pick); this._row(name, `X: ${pick}`, { source: 'Attorney edit' }); } else if (!want) { f.clear(); this._row(name, '', { source: 'Attorney edit' }); }
      }
    }
  }
  // all fields, for the editor and the comparison table
  // a computed fact shown on the field sheet that is not a form field (e.g. an attachment row)
  info(name, value, meta = {}) { this.rows.set(name, { field: name, item: meta.item || '', label: meta.label || name, value, source: meta.source || '', info: true }); }
  allFields() {
    const extra = [...this.rows.values()].filter((r) => r.info).map((r) => ({ field: r.field, type: 'info', page: 0, item: r.item, label: r.label, value: r.value, source: r.source }));
    return this.form.getFields().filter((f) => !(f instanceof PDFButton)).map((f) => {
      const name = f.getName();
      const row = this.rows.get(name);
      let value = '';
      if (f instanceof PDFTextField) value = f.getText() || '';
      else if (f instanceof PDFRadioGroup) value = row && row.value ? row.value : (f.getSelected() ? `X: ${f.getSelected()}` : '');
      else if (f instanceof PDFCheckBox) value = row && row.value !== undefined ? (row.value ? (row.value === 'X' ? 'X' : `X (${row.value})`) : '') : (f.isChecked() ? 'X' : '');
      const page = pageOf(this.doc, f);
      return { field: name, type: f instanceof PDFCheckBox ? 'checkbox' : 'text', page, item: row ? row.item : '', label: (row && row.label) || tooltip(f), value, source: row ? row.source : (value ? 'template' : 'not used for this case') };
    }).concat(extra);
  }
}

function pageOf(doc, field) {
  const w = field.acroField.getWidgets()[0];
  if (!w) return 0;
  const pref = w.P();
  const pages = doc.getPages();
  if (pref) { const i = pages.findIndex((p) => p.ref === pref); if (i >= 0) return i + 1; }
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots();
    if (annots && annots.asArray().some((a) => a === w.dict || doc.context.lookup(a) === w.dict)) return i + 1;
  }
  return 0;
}

// Hide the on-screen Print / Save / Clear buttons and the grey privacy notice so they never print.
function hideScreenOnlyWidgets(doc) {
  const form = doc.getForm();
  for (const f of form.getFields()) {
    // only the on-screen Print / Save / Clear buttons and the privacy notice; link buttons stay
    if (f instanceof PDFButton && /Print|Save|Reset|Clear|Warning|T23/.test(f.getName().split('.').pop())) { try { form.removeField(f); } catch (e) { /* ignore */ } }
  }
  // Old-style forms (DE-174, DE-260) carry the on-screen "press the Clear This Form button" notice
  // as text fields: remove them so they never show or print (and no flattening tool draws them)
  for (const f of form.getFields()) {
    const last = f.getName().split('.').pop().replace(/\[\d+\]$/, '');
    if (/^(WhiteOut|NoticeHeader\d*|NoticeFooter\d*|Warning\d*|T23)$/.test(last)) { try { form.removeField(f); } catch (e) { /* ignore */ } }
  }
  // The Judicial Council forms keep the grey button background in a "ViewOnly" layer (view on,
  // print off). Viewers and flattening tools do not all honour layer settings, so remove that
  // layer's content from the pages and turn the layer off.
  const { PDFDict, PDFArray, PDFRef, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
  const oc = doc.catalog.lookup(PDFName.of('OCProperties'));
  if (!oc) return;
  const viewOnly = new Set();
  const ocgs = oc.lookup(PDFName.of('OCGs'));
  if (ocgs instanceof PDFArray) {
    for (let i = 0; i < ocgs.size(); i += 1) {
      const ref = ocgs.get(i); const g = doc.context.lookup(ref);
      const name = g && g.lookup(PDFName.of('Name'));
      const usage = g && g.lookup(PDFName.of('Usage'));
      const pr = usage instanceof PDFDict && usage.lookup(PDFName.of('Print'));
      const ps = pr instanceof PDFDict && pr.lookup(PDFName.of('PrintState'));
      if ((name && /ViewOnly/i.test(name.decodeText ? name.decodeText() : String(name))) || (ps && ps.asString() === '/OFF')) viewOnly.add(ref.toString());
    }
  }
  const d = oc.lookup(PDFName.of('D'));
  if (d) {
    d.set(PDFName.of('ON'), doc.context.obj([]));
    d.set(PDFName.of('OFF'), doc.context.obj([...viewOnly].map((r) => PDFRef.of(Number(r.split(' ')[0]), Number(r.split(' ')[1])))));
  }
  if (!viewOnly.size) return;
  for (const page of doc.getPages()) {
    const res = page.node.Resources(); const props = res && res.lookup(PDFName.of('Properties'));
    if (!(props instanceof PDFDict)) continue;
    const tags = props.entries().filter(([, v]) => v instanceof PDFRef && viewOnly.has(v.toString())).map(([k]) => k.asString().slice(1));
    if (!tags.length) continue;
    const contents = page.node.Contents(); if (!contents) continue;
    const refs = contents instanceof PDFArray ? contents.asArray() : [page.node.get(PDFName.of('Contents'))];
    for (const ref of refs) {
      const st = doc.context.lookup(ref);
      if (!(st instanceof PDFRawStream)) continue;
      let text = Buffer.from(decodePDFRawStream(st).decode()).toString('latin1');
      const re = new RegExp(`/OC\\s*/(${tags.map((t) => t.replace(/[^A-Za-z0-9_]/g, '\\$&')).join('|')})\\s+BDC`, 'g');
      let out = ''; let pos = 0; let m;
      while ((m = re.exec(text))) {
        // skip to the matching EMC (marked content can nest)
        let depth = 1; const tok = /\b(BDC|BMC|EMC)\b/g; tok.lastIndex = m.index + m[0].length; let t; let end = -1;
        while ((t = tok.exec(text))) { depth += t[1] === 'EMC' ? -1 : 1; if (!depth) { end = t.index + 3; break; } }
        if (end < 0) break;
        out += text.slice(pos, m.index); pos = end; re.lastIndex = end;
      }
      if (!pos) continue;
      out += text.slice(pos);
      doc.context.assign(ref, doc.context.flateStream(Buffer.from(out, 'latin1')));
    }
  }
}

async function watermark(doc, text = 'DRAFT - NOT FOR FILING') {
  const font = await require('./fonts').embed(doc, 'HelveticaBold');
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = 54;
    const tw = font.widthOfTextAtSize(text, size);
    const ang = Math.atan2(height, width);
    const cx = width / 2; const cy = height / 2;
    page.drawText(text, {
      x: cx - (tw / 2) * Math.cos(ang) + (size / 3) * Math.sin(ang),
      y: cy - (tw / 2) * Math.sin(ang) - (size / 3) * Math.cos(ang),
      size, font, color: rgb(0.85, 0.1, 0.1), opacity: 0.22, rotate: degrees((ang * 180) / Math.PI),
    });
    page.drawText(`${text}: awaiting attorney approval`, { x: 36, y: height - 14, size: 8, font, color: rgb(0.85, 0.1, 0.1) });
  }
}

// The Judicial Council check boxes draw their marks with ZapfDingbats, which the forms never
// embed. Replace every check box / radio "on" appearance with a plain vector check mark so the
// printed and flattened page needs no font at all.
function vectorChecks(doc) {
  const { PDFDict, PDFStream } = require('pdf-lib');
  const ctx = doc.context;
  for (const f of doc.getForm().getFields()) {
    if (!(f instanceof PDFCheckBox) && !(f instanceof PDFRadioGroup)) continue;
    for (const w of f.acroField.getWidgets()) {
      const ap = w.dict.lookup(PDFName.of('AP'));
      if (!(ap instanceof PDFDict)) continue;
      const r = w.getRectangle(); const W = r.width, H = r.height; const s = Math.min(W, H);
      const x0 = (W - s) / 2, y0 = (H - s) / 2;
      const P = (fx, fy) => `${(x0 + fx * s).toFixed(2)} ${(y0 + fy * s).toFixed(2)}`;
      const ops = `q 0 g ${(s * 0.11).toFixed(2)} w 1 J 1 j ${P(0.2, 0.52)} m ${P(0.42, 0.25)} l ${P(0.82, 0.8)} l S Q`;
      for (const kind of ['N', 'D']) {
        const sub = ap.lookup(PDFName.of(kind));
        if (!(sub instanceof PDFDict)) continue;
        const hasOff = sub.keys().some((k) => k.asString() === '/Off');
        if (!hasOff || kind === 'N') sub.set(PDFName.of('Off'), ctx.register(ctx.flateStream(kind === 'N' ? '' : `q 0.75 g 0 0 ${W} ${H} re f Q`, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, W, H], Resources: {} })));
        for (const key of sub.keys()) {
          if (key.asString() === '/Off') continue;
          const stream = ctx.flateStream(kind === 'N' ? ops : `q 0.75 g 0 0 ${W} ${H} re f Q ${ops}`, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, W, H], Resources: {} });
          sub.set(key, ctx.register(stream));
        }
      }
      // keep viewers from rebuilding the mark from /MK with a font
      const mk = w.dict.lookup(PDFName.of('MK'));
      if (mk instanceof PDFDict) mk.delete(PDFName.of('CA'));
      w.dict.set(PDFName.of('DA'), PDFString.of('0 g'));
    }
    f.acroField.dict.delete(PDFName.of('DA'));
  }
  // and the (unembedded) ZapfDingbats entry in the form's default resources is then unused
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'));
  const dr = acro && acro.lookup(PDFName.of('DR'));
  const fonts = dr && dr.lookup(PDFName.of('Font'));
  if (fonts instanceof PDFDict) fonts.delete(PDFName.of('ZaDb'));
}

module.exports = { Filler, hideScreenOnlyWidgets, vectorChecks, watermark, tooltip, PDFDocument, StandardFonts, rgb };
