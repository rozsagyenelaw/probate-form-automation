// Builds the approval sample set for Rozsa, PDF only (Rozsa's decision of 2026-10-10):
//   <OUT>/NN-<form>[-rN].pdf : the filled document, then the blank Judicial Council revision
//                              (when there is one), then a review sheet: revision, questions asked
//                              with intake data only, warnings, and every field with value and source
//   <OUT>/00-COMBINED-forms-sample-set.pdf : cover and index, then every document above in order
// Fictional test cases only (Test Decedent, Los Angeles County). Every page is watermarked DRAFT.
// Usage: node scripts/sample-set.js <OUT>
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { PDFDocument, rgb } = require('pdf-lib');
const { generate, listForms, REGISTRY } = require('../lib/formgen');
const { embed } = require('../lib/formgen/fonts');
const { sanitize } = require('../lib/formgen/pleading');

const OUT = process.argv[2];
const FX = path.join(__dirname, '../test/fixtures');
const TPL = path.join(__dirname, '../templates/official');
const SRC = path.join(__dirname, '../templates/source');
const read = (f) => JSON.parse(fs.readFileSync(path.join(FX, f)));
const opt = (f) => (fs.existsSync(path.join(FX, f)) ? read(f) : {});
const answers = { ...read('answers-group-b.json'), ...read('answers-admin.json'), ...read('answers-full.json'), ...read('answers-sale.json'), ...opt('answers-mc950.json') };
const adminRecords = read('admin-records.json');

const RUNS = [
  { title: 'Full probate (Los Angeles, will, executor)', caseFile: 'test-case.json', extraCase: adminRecords,
    forms: ['FILING-STEPS', 'WILL-LODGING', 'DE-111', 'DE-142', 'DE-121', 'DE-140', 'DE-147', 'DE-147S', 'DE-150', 'MC-950', 'DE-157', 'NOTICE-9202-DHCS', 'NOTICE-9202-FTB', 'NOTICE-9202-CALVCB', 'NOTICE-9202-DCSS', 'DE-160', 'DE-161', 'BOE-502-D', 'DE-165', 'NOTICE-OF-SALE', 'DE-260', 'DE-120-SALE', 'DE-265', 'DE-174', 'PETITION-FINAL-DISTRIBUTION', { id: 'DE-120', extra: { purpose: 'final' } }, 'ORDER-FINAL-DISTRIBUTION', 'DE-295'] },
  { title: 'Primary residence petition (Prob. Code 13151)', caseFile: 'test-case-13151.json', forms: ['DE-310', { id: 'DE-120', extra: { purpose: '13151' } }, 'DE-315', 'DE-160', 'DE-161'] },
  { title: 'Spousal property petition (Prob. Code 13650)', caseFile: 'test-case-spousal.json', forms: ['DE-221', { id: 'DE-120', extra: { purpose: '13650' } }, 'DE-226'] },
  { title: 'Small estate affidavit (Prob. Code 13100)', caseFile: 'test-case-small.json', forms: ['SMALL-ESTATE-AFFIDAVIT'] },
  { title: 'Real property of small value (Prob. Code 13200)', caseFile: 'test-case-13200.json', forms: ['DE-305'] },
];

const sha1 = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');

// a landscape review sheet with wrapped table rows
async function sheet(doc, { heading, lines = [], table }) {
  const reg = await embed(doc, 'Helvetica'); const bold = await embed(doc, 'HelveticaBold');
  const W = 792; const H = 612; let page; let y;
  const wrap = (s, width, size, f = reg) => { const out = []; for (const para of sanitize(s).split('\n')) { let line = ''; for (const w of para.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; };
  const np = () => { page = doc.addPage([W, H]); y = H - 36; page.drawText(sanitize(heading), { x: 36, y, size: 11, font: bold }); y -= 18; };
  np();
  for (const l of lines) { const o = typeof l === 'string' ? { text: l } : l; for (const w of wrap(o.text, W - 72 - (o.indent || 0), 9, o.bold ? bold : reg)) { if (y < 40) np(); page.drawText(w, { x: 36 + (o.indent || 0), y, size: 9, font: o.bold ? bold : reg, color: o.red ? rgb(0.7, 0, 0) : rgb(0, 0, 0) }); y -= 11; } y -= 2; }
  if (table) {
    const cols = table.cols; y -= 6;
    const head = () => { cols.forEach((c) => page.drawText(c.title, { x: c.x, y, size: 8, font: bold })); y -= 11; };
    if (y < 60) np();
    head();
    for (const row of table.rows) {
      const cells = cols.map((c, i) => wrap(row[i] ?? '', c.w, 7.5));
      const h = Math.max(...cells.map((c) => c.length)) * 9 + 3;
      if (y - h < 30) { np(); head(); }
      cells.forEach((c, i) => c.forEach((l, k) => page.drawText(l, { x: cols[i].x, y: y - k * 9, size: 7.5, font: reg, color: row.empty ? rgb(0.45, 0.45, 0.45) : rgb(0, 0, 0) })));
      y -= h;
      page.drawLine({ start: { x: 36, y: y + 6 }, end: { x: W - 36, y: y + 6 }, thickness: 0.25, color: rgb(0.7, 0.7, 0.7) });
    }
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
  const combined = await PDFDocument.create();
  const index = []; const parts = [];
  let n = 0;
  for (const run of RUNS) {
    const caseData = { ...read(run.caseFile), ...(run.extraCase || {}) };
    const meta = Object.fromEntries(listForms(caseData, answers).map((m) => [m.id, m]));
    for (const entry of run.forms) {
      const id = typeof entry === 'string' ? entry : entry.id;
      const extraBase = typeof entry === 'string' ? {} : entry.extra;
      const m = meta[id]; const spec = REGISTRY.FORMS[id];
      if (!m) { console.log('not built', id); continue; }
      const recs = m.records && m.records.length ? m.records : (m.records ? [] : [null]);
      for (const r of recs) {
        n += 1;
        const extra = { ...extraBase, ...(r ? { record: r.index } : {}) };
        const name = `${String(n).padStart(2, '0')}-${id}${r ? `-r${r.index + 1}` : ''}${extraBase.purpose ? `-${extraBase.purpose}` : ''}`;
        const full = await generate({ formId: id, caseData, answers, extra, approved: false });
        const intakeOnly = await generate({ formId: id, caseData, answers: {}, extra, approved: false }).catch(() => null);
        const doc = await PDFDocument.load(full.pdfBytes);
        try { doc.getForm().flatten(); } catch (e) { /* generated documents have no form */ }
        const filledPages = doc.getPageCount();
        let blankPages = 0;
        if (spec.kind === 'jc') {
          const blank = await PDFDocument.load(fs.readFileSync(path.join(TPL, spec.template)));
          try { blank.getForm().flatten(); } catch (e) { /* no form */ }
          const pages = await doc.copyPages(blank, blank.getPageIndices());
          const lab = await embed(doc, 'HelveticaBold');
          for (const p of pages) { doc.addPage(p); p.drawText(`BLANK ${spec.revision.toUpperCase()} (for comparison)`, { x: 36, y: p.getHeight() - 14, size: 8, font: lab, color: rgb(0, 0.3, 0.7) }); blankPages += 1; }
        }
        const srcFile = spec.template ? path.join(SRC, spec.template) : null;
        const needsI = intakeOnly ? intakeOnly.needs : [];
        await sheet(doc, {
          heading: `Review sheet: ${id} ${full.title}${r ? ` (${r.label})` : ''} - ${run.title} (fictional)`,
          lines: [
            `Revision: ${full.revision}${full.sourceUrl ? `  |  Blank form: ${full.sourceUrl}` : ''}${srcFile && fs.existsSync(srcFile) ? `  |  SHA-1 of the courts.ca.gov download: ${sha1(srcFile)}` : ''}`,
            spec.kind === 'jc' ? `This file: ${filledPages} filled page(s), then the ${blankPages} page(s) of the blank revision, then this sheet.` : 'Generated document (no Judicial Council form exists for it).',
            { text: `With only the client's intake answers, the generator asks ${needsI.length} question(s):`, bold: true },
            ...needsI.map((q) => ({ text: `- ${q.question}`, indent: 10 })),
            ...(full.warnings.length ? [{ text: 'Notes shown in the admin:', bold: true }, ...full.warnings.map((w) => ({ text: `- ${w}`, indent: 10, red: true }))] : []),
            { text: `This sample adds fictional answers; questions still open: ${full.needs.length}${full.needs.length ? ` (${full.needs.map((q) => q.key).join(', ')})` : ''}.`, bold: true },
          ],
          table: { cols: [{ title: 'Item', x: 36, w: 46 }, { title: 'Field', x: 86, w: 190 }, { title: 'Value', x: 282, w: 210 }, { title: 'Source of the value', x: 498, w: 258 }],
            rows: full.fields.map((f) => Object.assign([f.item, f.label, f.value || '(blank)', f.source], { empty: !f.value })) },
        });
        const bytes = await doc.save();
        fs.writeFileSync(path.join(OUT, `${name}.pdf`), bytes);
        parts.push(bytes);
        index.push({ name, id, title: full.title, rec: r ? r.label : '', run: run.title, revision: full.revision, needsI: needsI.length });
        console.log(name, 'fields', full.fields.length, 'needs(intake only)', needsI.length, 'needs(sample)', full.needs.length);
      }
    }
  }
  await sheet(combined, {
    heading: 'Court forms sample set for approval (HOLD FOR ME) - October 10, 2026',
    lines: [
      'Fictional test cases only (Test Decedent, Los Angeles County). Every page is marked DRAFT - NOT FOR FILING. Nothing has been sent to anyone.',
      'Per your decision of October 10: the client is the petitioner and files as a self-represented party. No attorney name, State Bar number, firm name or firm email appears on any court form, pleading or letter. The only exception is MC-950, the notice of limited scope representation used when you appear at a hearing ($500 per hearing).',
      'For each document: the filled form, then the blank Judicial Council revision page by page, then a review sheet with every field, its value and its source, and the questions the generator asks when only the intake answers exist.',
      'The same documents are also saved one per file in this folder (NN-FORM.pdf).',
    ],
    table: { cols: [{ title: 'File', x: 36, w: 120 }, { title: 'Document', x: 160, w: 250 }, { title: 'Procedure', x: 414, w: 170 }, { title: 'Revision', x: 588, w: 110 }, { title: 'Asks', x: 702, w: 50 }],
      rows: index.map((x) => [x.name, `${x.id}: ${x.title}${x.rec ? ` (${x.rec})` : ''}`, x.run, x.revision, String(x.needsI)]) },
  });
  for (const b of parts) { const d = await PDFDocument.load(b); const pages = await combined.copyPages(d, d.getPageIndices()); pages.forEach((p) => combined.addPage(p)); }
  fs.writeFileSync(path.join(OUT, '00-COMBINED-forms-sample-set.pdf'), await combined.save());
  console.log('done', n, 'documents; combined pages', combined.getPageCount());
})().catch((e) => { console.error(e); process.exit(1); });
