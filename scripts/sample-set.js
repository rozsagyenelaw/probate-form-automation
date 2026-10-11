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
const answers = { ...read('answers-group-b.json'), ...read('answers-admin.json'), ...read('answers-full.json'), ...read('answers-sale.json'), ...opt('answers-civ150.json') };
const adminRecords = read('admin-records.json');

const RUNS = [
  { title: 'Full probate (Los Angeles, will, executor)', caseFile: 'test-case.json', extraCase: adminRecords,
    forms: ['FILING-STEPS', 'WILL-LODGING', 'DE-111', 'DE-142', 'DE-121', 'MAILING-STEPS', 'PUBLICATION-STEPS', 'DE-140', 'DE-147', 'DE-147S', 'DE-150', 'CIV-150', 'PRO-010', 'DE-157', 'NOTICE-9202-DHCS', 'NOTICE-9202-FTB', 'NOTICE-9202-CALVCB', 'NOTICE-9202-DCSS', 'DE-160', 'DE-161', 'BOE-502-D', 'DE-165', 'STEP-GUIDES', 'NOTICE-OF-SALE', 'DE-260', 'DE-120-SALE', 'PRO-009', 'DE-265', 'DE-174', 'PETITION-FINAL-DISTRIBUTION', { id: 'DE-120', extra: { purpose: 'final' } }, 'ORDER-FINAL-DISTRIBUTION', 'DE-295'] },
  { title: 'Primary residence petition (Prob. Code 13151)', caseFile: 'test-case-13151.json', forms: ['FILING-STEPS', 'PRO-010', 'DE-310', { id: 'DE-120', extra: { purpose: '13151' } }, 'MAILING-STEPS', 'DE-315', 'DE-160', 'DE-161'] },
  { title: 'Spousal property petition (Prob. Code 13650)', caseFile: 'test-case-spousal.json', forms: ['FILING-STEPS', 'PRO-010', 'DE-221', { id: 'DE-120', extra: { purpose: '13650' } }, 'MAILING-STEPS', 'DE-226'] },
  { title: 'Small estate affidavit (Prob. Code 13100)', caseFile: 'test-case-small.json', forms: ['FILING-STEPS', 'SMALL-ESTATE-AFFIDAVIT'] },
  { title: 'Real property of small value (Prob. Code 13200)', caseFile: 'test-case-13200.json', forms: ['FILING-STEPS', 'PRO-010', 'DE-305', 'DE-160', 'DE-161'] },
];


const REVIEW_FIXES = [
  ['A', 'Attorney and firm on captions, signatures, body fields and letters', 'Every court form and pleading shows the client as the self-represented petitioner (name, address, phone, email; "Self-represented" on the Attorney for line; State Bar and firm blank; attorney signature lines blank). Letters are written by the personal representative or will custodian. The only paper with Rozsa\'s details is CIV-150 (hearing appearance). Questions offering "the attorney office" were removed. Test email replaced with test.executor@example.com. A smoke test fails if any firm detail appears.', 'Every document; 12-CIV-150'],
  ['B', 'Names in ALL CAPS', 'Normal capitalization for names, county and courthouse (Test Decedent, Los Angeles, Stanley Mosk Courthouse).', 'Every document'],
  ['C', 'Impossible dates', 'One coherent timeline (death 3/15/2026, hearing 5/12/2026, Letters 5/20/2026, sale 9/15/2026, confirmation 11/10/2026, final hearing and order 4/13/2027). The generator now warns when any dates in a file are out of order.', 'Review sheets (Notes)'],
  ['D', 'Sale of the residence contradicted the rest of the file', 'One sale route: court confirmation (notice of sale, DE-260, DE-120, DE-265). The Notice of Proposed Action sample is now a separate action (sale of the car). Gains and losses come from the sale answers; property on hand is the sale proceeds; DE-295 and BOE-502-D follow the sale; the petition and order warn if property on hand lists a sold parcel.', 'Petition for final distribution, order, DE-295, BOE-502-D, DE-165'],
  ['E', 'Statutory compensation "each" (attorney and PR)', 'No attorney compensation of any kind. The petition states the petitioner is self-represented and no attorney compensation is paid or payable (10954(c)(1)). The personal representative\'s 10800 commission appears only if the client asks for it (answer final.prRequestsCompensation); this sample: not requested.', 'Petition and order for final distribution'],
  ['F', 'Order had no legal description', 'The order prints the legal description from the file for any real property distributed; when the property was sold, the order distributes the proceeds and no real property.', 'Order for final distribution'],
  ['G', 'DE-120 (final) item 1 blank, question left open', 'Whether the account is waived is taken from the petition (report on waiver of account); item 1 is filled.', 'DE-120 final'],
  ['H', '13151 inventory covered the wrong property; bond statement', 'For 13151 the inventory lists only the primary residence (13152(b)); for 13200 only California real property. No Attachment 1. The bond statement is blank and the declarant is the petitioner. The residence value is checked against the limit (warning).', '13151 set: DE-160, DE-161'],
  ['I', 'Small estate affidavit for the vehicle', 'No affidavit is generated for a registered vehicle (Prob. Code 13050(b)(1)); a note says it transfers through the DMV.', 'Small estate affidavits'],
  ['J', 'Purchasers missing from the sale hearing notice', 'The purchasers named in the petition are added to the DE-120 service list (10308(c)).', 'DE-120 for the sale hearing'],
  ['K', 'Small estate affidavit checks', 'Each account\'s title is asked (the decedent alone, payable-on-death, joint, trust); only accounts in the decedent\'s name alone are included. The total counted toward the limit excludes vehicles and non-probate accounts. 40-day check and the death certificate and DE-300 attachments are stated.', 'Small estate affidavits'],
  ['L', 'Personal property may include non-probate accounts', 'DE-111 item 3d(1) leaves out accounts that pass outside probate and asks how any unanswered account is titled.', 'DE-111'],
  ['M', 'On-screen "Clear This Form" notice text', 'The notice fields (DE-174, DE-260) are now removed, not just hidden; the grey button background layer is removed from the page content; review copies are flattened with qpdf, which prints only what prints. Checked on the rendered pages, including the blank comparison pages.', 'DE-260, DE-174, DE-140, DE-150, every blank page'],
  ['V1', 'Check marks did not print (BOE-502-D); unembedded ZapfDingbats', 'Every check box and radio mark is drawn as a plain vector check (no font). Text is drawn with embedded Liberation Sans. The only unembedded fonts left are the court\'s own printed form text (Arial, Helvetica, Courier).', 'BOE-502-D, every Judicial Council form'],
  ['V2', 'Letter dates (C)', 'Letters are dated from the file (the 9202 notice dates in the petition; the will lodging date), never silently after a deadline: past a deadline the date is left blank and asked for, with a warning.', 'WILL-LODGING, NOTICE-9202-DHCS, NOTICE-9202-FTB'],
  ['V3', 'Will lodging version', 'With a case number on file, the pending-petition version is used. The will goes to the court clerk (Prob. Code 8200), never to the office.', 'WILL-LODGING'],
  ['V4', 'E-filing consent sentence', 'Now: "Filing online does not mean you agree to get court papers by email. Agree to that only if you want it." (CCP 1010.6(c)(3); CRC 2.251(c)(3)(B)). Double period after "p.m." removed.', 'FILING-STEPS'],
  ['V5', 'Client guides missing', 'New guides: papers for Letters (DE-140, DE-150, DE-147, DE-147S; Prob. Code 8404, LASC LR 4.30); notice to creditors (9050, 9051); state agency notices (9202); each claim decision (9250); each notice of proposed action (10586); notice of sale publication (10300, Gov. Code 6063a). 13151: five-business-day notice (13151(b)), Attachment 8 and DE-300 (13152), $435 fee. 13200: PRO 010, DE-160/DE-161, $45 fee (Gov. Code 70626(b)(8)).', 'FILING-STEPS, STEP-GUIDES, client step guides section'],
  ['V6', 'Mailing guides', 'The mailer is told to check box 3a. Sources per notice: 8110 (petition), 10308(c)/1220/1230 (sale), 11601/1220 (final), 13153/1220/13151(b) (13151), 13655/1220 (13650). Each buyer is listed and mailed separately with the address (CRC 7.51(a)(3)), also on DE-120-SALE.', 'MAILING-STEPS, DE-120-SALE'],
  ['V7', 'CIV-150 (decision D4)', 'Item 2a: "and at any continuance of that hearing" and "until submission of the order after hearing" are checked for every case; the per-hearing question is gone. Printed names under both signatures. Proof of service by mail pre-filled with the persons given notice of the hearing (not the client), to be completed and signed by the adult non-party who mails it (rule 3.36(a)).', 'CIV-150'],
  ['V8', 'PRO 010 (decision D5)', 'Step 2 is computed under LASC Local Rule 2.3(a)(1)(A) (July 1, 2026 edition): Central filing marks the last column; North filing marks "District where decedent resided". The question is gone. The field sheet shows every checked box and cites the rule. 13200 checks "Affidavit - Real Property of Small Value - 13200 PR Code [3001]".', 'PRO 010 (all four)'],
  ['V9', 'Overbid form (decision D7)', 'LASC PRO 009 Bid In Open Court on Sale of Real Property (Rev. 04/26) is generated with the sale packet, labelled "USE ONLY IF AN OVERBID HAPPENS AT THE SALE HEARING"; the lowest acceptable overbid is computed (Prob. Code 10311(a)(1)); LASC LR 4.39(c).', 'PRO-009'],
  ['V10', 'Legal descriptions', 'Each parcel has its own legal description; the case-wide answer is used only when there is one parcel. Generated: DE-260 Attachment 2e (and 4a when the vesting does not fit), DE-265 Attachment 9, DE-221 7a/7b and DE-226 5a/7a rows with address, APN and legal description, DE-305 Attachment 5a per parcel.', 'DE-260, DE-265, DE-221, DE-226, DE-305'],
  ['V11', 'Final petition numbers', 'Para 11 total computed from the inventories (Attachment 1 confirmed values + referee total). Para 18 (and order item 5): the cash figure is checked against the file and blocked when it is higher. Para 12: NOPA mailing date shown and checked against 10586; the court-confirmed sale is in its own paragraph 12A. Para 15 reworded. DE-120 final mentions compensation only when the personal representative asks for it. Order item 6 states what is "none".', 'PETITION-FINAL-DISTRIBUTION, ORDER, DE-120 final'],
  ['V12', 'Other', 'DE-174 item 6 from the inventory or the petition estimate (9250(c)(5)). DE-310 value check shown on the field sheet. DE-221 asks whether the will gives the property to the spouse (13500). Notice of sale: no attorney wording; newspaper instruction moved to the client guide. FTB address per FTB 1240 (Rev. 03/2025). DHCS letter: "copy" in body and enclosures. Small estate affidavit: notary only if the holder asks (13101).', 'DE-174, DE-310, DE-221, NOTICE-OF-SALE, NOTICE-9202-FTB/DHCS, SMALL-ESTATE-AFFIDAVIT'],
  ['2', 'Documents not needed in this case', 'Not generated, listed below with the reason: DE-142 waivers (the will waives bond), CalVCB and DCSS letters when not required, and the will copy to the executor when the custodian is the executor. The will lodging letter, when a petition is already pending, lodges the will in that case instead of citing 8200.', 'This page'],
  ['2', 'DE-121 item 10 is published', 'A note tells the client they may use a mailing address.', 'DE-121 notes'],
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
  const index = []; const parts = []; const notNeeded = [];
  let n = 0;
  for (const run of RUNS) {
    const caseData = { ...read(run.caseFile), ...(run.extraCase || {}) };
    const meta = Object.fromEntries(listForms(caseData, answers).map((m) => [m.id, m]));
    for (const m of Object.values(meta)) if (m.notNeeded && run.forms.some((e) => (typeof e === 'string' ? e : e.id) === m.id)) notNeeded.push([run.title, m.id, m.title, m.notNeeded]);
    for (const entry of run.forms) {
      const id = typeof entry === 'string' ? entry : entry.id;
      const extraBase = typeof entry === 'string' ? {} : (entry.extra || {});
      const base = { ...answers, ...(run.answers || {}) };
      const ans = typeof entry === 'object' && entry.dropAnswers ? Object.fromEntries(Object.entries(base).filter(([k]) => !entry.dropAnswers.includes(k))) : base;
      const m = meta[id]; const spec = REGISTRY.FORMS[id];
      if (!m) { console.log('not built', id); continue; }
      if (m.notNeeded) continue;
      const recs = m.records && m.records.length ? m.records : (m.records ? [] : [null]);
      for (const r of recs) {
        n += 1;
        const extra = { ...extraBase, ...(r ? { record: r.index } : {}) };
        const name = `${String(n).padStart(2, '0')}-${id}${r ? `-r${r.index + 1}` : ''}${extraBase.purpose ? `-${extraBase.purpose}` : ''}`;
        const cd = typeof entry === 'object' && entry.dropAnswers ? { ...caseData, court: { ...(caseData.court || {}), caseNumber: null } } : caseData;
        const full = await generate({ formId: id, caseData: cd, answers: ans, extra, approved: false });
        const intakeOnly = await generate({ formId: id, caseData: cd, answers: {}, extra, approved: false }).catch(() => null);
        // review copy: flatten with qpdf (prints only what prints: hidden widgets and screen-only
        // layers stay out, check marks keep their own appearance streams)
        const tmpIn = path.join(require('os').tmpdir(), `ss-${process.pid}-in.pdf`); const tmpOut = tmpIn.replace('-in', '-out');
        fs.writeFileSync(tmpIn, full.pdfBytes);
        try { require('child_process').execFileSync('qpdf', ['--flatten-annotations=print', tmpIn, tmpOut], { stdio: 'ignore' }); } catch (e) { if (!fs.existsSync(tmpOut)) fs.copyFileSync(tmpIn, tmpOut); }
        const doc = await PDFDocument.load(fs.readFileSync(tmpOut));
        const filledPages = doc.getPageCount();
        let blankPages = 0;
        if (spec.kind === 'jc') {
          const bIn = path.join(require('os').tmpdir(), `ss-${process.pid}-bin.pdf`); const bOut = bIn.replace('-bin', '-bout');
          { const bdoc = await PDFDocument.load(fs.readFileSync(path.join(TPL, spec.template)), { updateMetadata: false }); require('../lib/formgen/pdf').hideScreenOnlyWidgets(bdoc); fs.writeFileSync(bIn, await bdoc.save({ updateFieldAppearances: false })); }
          try { require('child_process').execFileSync('qpdf', ['--flatten-annotations=print', bIn, bOut], { stdio: 'ignore' }); } catch (e) { if (!fs.existsSync(bOut)) fs.copyFileSync(bIn, bOut); }
          const blank = await PDFDocument.load(fs.readFileSync(bOut));
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
      'Per your decision of October 10: the client is the petitioner and files as a self-represented party. No attorney name, State Bar number, firm name or firm email appears on any court form, pleading or letter. The only exception is CIV-150, the notice of limited scope representation (MC-950 no longer exists; rule 3.36 names CIV-150) used when you appear at a hearing ($500 per hearing).',
      'For each document: the filled form, then the blank Judicial Council revision page by page, then a review sheet with every field, its value and its source, and the questions the generator asks when only the intake answers exist.',
      'The same documents are also saved one per file in this folder (NN-FORM.pdf).',
    ],
    table: { cols: [{ title: 'File', x: 36, w: 120 }, { title: 'Document', x: 160, w: 250 }, { title: 'Procedure', x: 414, w: 170 }, { title: 'Revision', x: 588, w: 110 }, { title: 'Asks', x: 702, w: 50 }],
      rows: index.map((x) => [x.name, `${x.id}: ${x.title}${x.rec ? ` (${x.rec})` : ''}`, x.run, x.revision, String(x.needsI)]) },
  });
  await sheet(combined, {
    heading: 'Review fixes (independent review of the earlier sample set): every MUST FIX and how it was fixed',
    lines: ['Each item below is from notes/REVIEW-forms-sample-set.md. The fixed result is visible in the documents named in the last column.'],
    table: { cols: [{ title: 'Item', x: 36, w: 28 }, { title: 'Finding', x: 68, w: 150 }, { title: 'Fix', x: 222, w: 380 }, { title: 'See', x: 606, w: 150 }], rows: REVIEW_FIXES },
  });
  if (notNeeded.length) await sheet(combined, { heading: 'Documents not needed in this sample case (not generated)', lines: [], table: { cols: [{ title: 'Procedure', x: 36, w: 170 }, { title: 'Document', x: 210, w: 220 }, { title: 'Why not needed', x: 434, w: 322 }], rows: [...new Map(notNeeded.map((n) => [n[1] + n[0], [n[0], `${n[1]}: ${n[2]}`, n[3]]])).values()] } });
  // Client step guides: the exact words written to the client's progress bar (cases/{id}/clientSteps)
  await sheet(combined, { heading: 'Client step guides (portal progress bar)', lines: [
    'These are the out-of-app steps each client sees in the portal, word for word, with the court documents attached when the office sends them. They come from one source (lib/formgen/clientSteps.js) and are written server side when a case reaches the stage.',
    'HOLD: nothing is written to a real client until you approve (setting config/business.stepGuidesApproved, default false). Only TEST cases get them now.',
    'Every legal statement has its source listed under the step.',
  ] });
  const { buildSteps } = require('../lib/formgen/clientSteps');
  const { renderStep } = require('../lib/formgen/steprender');
  for (const run of RUNS) {
    const cd = { ...read(run.caseFile), ...(run.extraCase || {}) };
    for (const st of buildSteps({ caseData: cd, answers, phase: 11 })) {
      const sd = await renderStep({ ...st, title: `${st.title} [${run.title}; shown at stage ${st.phase}]` }, { estateName: [cd.decedent.firstName, cd.decedent.lastName].join(' ') });
      await require('../lib/formgen/pdf').watermark(sd);
      const sb = await PDFDocument.load(await sd.save());
      (await combined.copyPages(sb, sb.getPageIndices())).forEach((pg) => combined.addPage(pg));
    }
  }
  for (const b of parts) { const d = await PDFDocument.load(b); const pages = await combined.copyPages(d, d.getPageIndices()); pages.forEach((p) => combined.addPage(p)); }
  fs.writeFileSync(path.join(OUT, '00-COMBINED-forms-sample-set.pdf'), await combined.save());
  console.log('done', n, 'documents; combined pages', combined.getPageCount());
})().catch((e) => { console.error(e); process.exit(1); });
