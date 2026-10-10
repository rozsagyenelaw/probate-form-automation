// Dev: node scripts/try-records.js <ID> <outdir> [answers.json] [extraCase.json]
// Generates every record of a form (or the single form) with the test case, merging an optional
// fixture of extra case data (creditorClaims, proposedActions) and fictional answers.
const fs = require('fs'); const path = require('path');
const { generate, listForms } = require('../lib/formgen');
(async () => {
  const [id, out, ansFile, extraFile] = process.argv.slice(2);
  const caseData = JSON.parse(fs.readFileSync(path.join(__dirname, '../test/fixtures/test-case.json')));
  if (extraFile) Object.assign(caseData, JSON.parse(fs.readFileSync(extraFile)));
  const answers = ansFile ? JSON.parse(fs.readFileSync(ansFile)) : {};
  const meta = listForms(caseData, answers).find((x) => x.id === id);
  const recs = meta.records ? meta.records : [null];
  for (const r of recs) {
    const res = await generate({ formId: id, caseData, answers, extra: r ? { record: r.index } : {} });
    const name = `${id}${r ? `-r${r.index + 1}` : ''}`;
    fs.writeFileSync(path.join(out, `${name}.pdf`), res.pdfBytes);
    console.log(name, r ? `(${r.label})` : '', '\n  needs:', res.needs.map((n) => n.key).join(', '), '\n  warnings:', res.warnings.join(' | '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
