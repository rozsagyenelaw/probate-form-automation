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
    else if (f instanceof PDFRadioGroup) { if (on) f.select(typeof on === 'string' ? on : f.getOptions()[0]); }
    else throw new Error(`${this.formId}: ${name} is not a checkbox`);
    this._row(name, on ? 'X' : '', { ...meta, source: meta.source || 'fixed' });
  }
  // apply Rozsa's field edits from the editor
  applyOverrides(overrides = {}) {
    for (const [name, val] of Object.entries(overrides)) {
      const f = this.byName.get(name);
      if (!f) continue;
      if (f instanceof PDFCheckBox) { if (val === true || val === 'X' || val === 'true') f.check(); else f.uncheck(); this._row(name, val === true || val === 'X' || val === 'true' ? 'X' : '', { source: 'Attorney edit' }); }
      else if (f instanceof PDFTextField) { f.setText(String(val ?? '')); this._row(name, String(val ?? ''), { source: 'Attorney edit' }); }
    }
  }
  // all fields, for the editor and the comparison table
  allFields() {
    return this.form.getFields().filter((f) => !(f instanceof PDFButton)).map((f) => {
      const name = f.getName();
      const row = this.rows.get(name);
      let value = '';
      if (f instanceof PDFTextField) value = f.getText() || '';
      else if (f instanceof PDFCheckBox) value = f.isChecked() ? 'X' : '';
      const page = pageOf(this.doc, f);
      return { field: name, type: f instanceof PDFCheckBox ? 'checkbox' : 'text', page, item: row ? row.item : '', label: (row && row.label) || tooltip(f), value, source: row ? row.source : (value ? 'template' : 'not used for this case') };
    });
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
  // The Judicial Council forms keep the grey button background in a "ViewOnly" layer. Turn
  // that layer off so it never shows or prints.
  const oc = doc.catalog.lookup(PDFName.of('OCProperties'));
  if (oc) {
    const d = oc.lookup(PDFName.of('D'));
    if (d) d.set(PDFName.of('ON'), doc.context.obj([]));
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

module.exports = { Filler, hideScreenOnlyWidgets, watermark, tooltip, PDFDocument, StandardFonts, rgb };
