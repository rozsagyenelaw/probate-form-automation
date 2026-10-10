// Dev: node scripts/try-fixture.js <FORM> <caseFixture.json> [answers.json|-] [outdir] [extraJSON]
const fs = require('fs'); const path = require('path');
const { generate } = require('../lib/formgen');
(async () => {
  const [id, fx, ansF, out = '/tmp', extraJ] = process.argv.slice(2);
  const caseData = JSON.parse(fs.readFileSync(fx));
  const answers = ansF && ansF !== '-' ? JSON.parse(fs.readFileSync(ansF)) : {};
  const extra = extraJ ? JSON.parse(extraJ) : {};
  const r = await generate({ formId: id, caseData, answers, extra, approved: false, now: new Date('2026-10-10T18:00:00Z') });
  const name = `${id}${extra.record !== undefined ? `-${extra.record}` : ''}`;
  fs.writeFileSync(path.join(out, `${name}.pdf`), r.pdfBytes);
  console.log('needs:', r.needs.map((n) => n.key).join(', ') || '(none)');
  console.log('warnings:', r.warnings.join(' | '));
})().catch((e) => { console.error(e); process.exit(1); });
