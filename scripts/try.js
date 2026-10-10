// Dev: node scripts/try.js DE-111 [answersFile] > writes PDF and prints needs
const fs = require('fs'); const path = require('path');
const { generate } = require('../lib/formgen');
(async () => {
  const id = process.argv[2]; const ans = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])) : {};
  const caseData = JSON.parse(fs.readFileSync(path.join(__dirname, '../test/fixtures/test-case.json')));
  const out = process.argv[4] || '/tmp';
  const r = await generate({ formId: id, caseData, answers: ans, approved: false });
  fs.writeFileSync(path.join(out, `${id}.pdf`), r.pdfBytes);
  console.log('needs:', r.needs.map((n) => n.key).join(', '));
  console.log('warnings:', r.warnings.join(' | '));
})().catch((e) => { console.error(e); process.exit(1); });
