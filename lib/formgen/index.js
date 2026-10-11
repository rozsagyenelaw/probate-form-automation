// MyProbateCA form generator. One engine for every court form and pleading.
//
// generate({ formId, caseData, answers, overrides, approved, extra })
//   -> { formId, title, revision, sourceUrl, pdfBytes, fields, needs, warnings, draft }
//
// HOLD FOR ME: unless `approved` is true (config/business.formsApproved, set only by Rozsa),
// every page is watermarked "DRAFT - NOT FOR FILING".
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { makeFacts } = require('./facts');
const { Filler, hideScreenOnlyWidgets, watermark } = require('./pdf');
const REGISTRY = require('./registry');

// Template folder: works from the repo, from scripts, and inside the bundled Netlify function.
const TEMPLATE_DIRS = [
  process.env.FORMGEN_TEMPLATES,
  path.join(__dirname, '..', '..', 'templates', 'official'),
  path.join(process.cwd(), 'templates', 'official'),
  process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, 'templates', 'official'),
].filter(Boolean);

function loadTemplate(file) {
  for (const d of TEMPLATE_DIRS) { const p = path.join(d, file); if (fs.existsSync(p)) return fs.readFileSync(p); }
  throw new Error(`Template ${file} not found`);
}

// caseData/answers optional: when given, multi-record forms list their records
function listForms(caseData, answers) {
  const F = caseData ? makeFacts(caseData, answers || {}) : null;
  return Object.values(REGISTRY.FORMS).map((s) => ({
    id: s.id, title: s.title, revision: s.revision, sourceUrl: s.sourceUrl, kind: s.kind, procedures: s.procedures, note: s.note || '', confidential: !!s.confidential,
    records: s.records && F ? s.records(F).map((r, i) => ({ index: i, label: r.label })) : null,
    notNeeded: s.notNeeded && F ? s.notNeeded(F) || null : null,
  }));
}

async function generate({ formId, caseData = {}, answers = {}, overrides = {}, approved = false, extra = {}, now = new Date() }) {
  const spec = REGISTRY.FORMS[formId];
  if (!spec) throw new Error(`Unknown form ${formId}`);
  // generated documents: Rozsa's edits in the field editor are answers to the same keys
  const spec0 = REGISTRY.FORMS[formId];
  const F = makeFacts(caseData, spec0 && spec0.kind !== 'jc' ? { ...answers, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, { value: v, source: 'Attorney edit' }])) } : answers);
  const warnings = [];
  const ctx = { extra, warnings, now, overrides };
  // forms filed once per person (e.g. DE-142 per heir, DE-174 per claim): extra.record picks one
  if (spec.records) {
    const recs = spec.records(F);
    ctx.records = recs;
    ctx.record = recs[Number(extra.record || 0)];
    if (!ctx.record) throw new Error(`${formId}: no record ${extra.record || 0} (this case has ${recs.length})`);
  }
  let doc; let fields = [];
  if (spec.kind === 'jc') {
    doc = await PDFDocument.load(loadTemplate(spec.template), { updateMetadata: false });
    const f = new Filler(doc, formId);
    await spec.fill(f, F, ctx);
    f.applyOverrides(overrides);
    hideScreenOnlyWidgets(doc);
    if (spec.after) await spec.after(doc, F, ctx);
    fields = f.allFields();
  } else {
    // generated documents (pleadings, letters, affidavits): spec.build returns
    // { doc, fields } where fields are the editable values used to build it
    const built = await spec.build(F, ctx);
    doc = built.doc; fields = built.fields;
  }
  for (const w of require('./logic').dateSequence(F)) if (!warnings.includes(w)) warnings.push(w);
  if (!approved) await watermark(doc);
  doc.setTitle(`${formId} ${spec.title}${approved ? '' : ' (DRAFT - NOT FOR FILING)'}`);
  doc.setAuthor('Law Offices of Rozsa Gyene');
  doc.setCreator('MyProbateCA form generator');
  doc.setProducer('MyProbateCA form generator');
  if (spec.kind === 'jc') {
    // text: drawn with embedded Liberation Sans (full font, so later edits in a viewer still work);
    // check boxes: plain vector marks (no font). pdf-lib's own check box appearances are not used.
    const { PDFTextField, PDFDropdown } = require('pdf-lib');
    const sans = await require('./fonts').embed(doc, 'Helvetica', { subset: false });
    // the forms' default resources name unembedded Helvetica (/Helv) and ZapfDingbats (/ZaDb);
    // point them at the embedded Liberation Sans so nothing unembedded is left to copy
    const { PDFName: N, PDFDict: D } = require('pdf-lib');
    const acro = doc.catalog.lookup(N.of('AcroForm'));
    const drf = acro && acro.lookup(N.of('DR')) && acro.lookup(N.of('DR')).lookup(N.of('Font'));
    if (drf instanceof D) { drf.set(N.of('Helv'), sans.ref); drf.delete(N.of('ZaDb')); }
    for (const fld of doc.getForm().getFields()) {
      if (fld instanceof PDFTextField || fld instanceof PDFDropdown) { try { fld.updateAppearances(sans); } catch (e) { /* comb or odd field: keep viewer appearance */ } }
    }
    require('./pdf').vectorChecks(doc);
  }
  const pdfBytes = await doc.save({ updateFieldAppearances: false });
  return { formId, title: spec.title, revision: spec.revision, sourceUrl: spec.sourceUrl, kind: spec.kind, pdfBytes, fields, needs: F.needs(), warnings, draft: !approved };
}

module.exports = { generate, listForms, REGISTRY };
