// npm test: every form generates for every fixture, with and without answers; checks the
// house rules that matter on paper. Exit 1 on any failure.
const fs = require('fs'); const path = require('path');
const { generate, listForms } = require('../lib/formgen');
const FX = path.join(__dirname, 'fixtures');
const read = (f) => JSON.parse(fs.readFileSync(path.join(FX, f)));
const answers = { ...read('answers-group-b.json'), ...read('answers-admin.json'), ...read('answers-full.json'), ...read('answers-sale.json') };
const cases = ['test-case.json', 'test-case-13151.json', 'test-case-spousal.json', 'test-case-small.json', 'test-case-13200.json'];
const fails = []; let n = 0;
(async () => {
  for (const cf of cases) {
    const caseData = { ...read(cf), ...(cf === 'test-case.json' ? read('admin-records.json') : {}) };
    for (const m of listForms(caseData, answers)) {
      if (m.records && !m.records.length) continue; // nothing in the file to generate (e.g. no parcel)
      const recs = m.records ? m.records.map((r) => r.index) : [undefined];
      for (const rec of recs) for (const ans of [{}, answers]) {
        n += 1;
        const tag = `${cf} ${m.id}${rec !== undefined ? `#${rec}` : ''} ${Object.keys(ans).length ? 'answers' : 'intake-only'}`;
        try {
          const r = await generate({ formId: m.id, caseData, answers: ans, extra: rec !== undefined ? { record: rec } : {} });
          if (!r.draft) fails.push(`${tag}: not marked draft`);
          if (!r.pdfBytes || r.pdfBytes.length < 1000) fails.push(`${tag}: empty PDF`);
          for (const f of r.fields) {
            if (f.value && !f.source) fails.push(`${tag}: ${f.field} has a value without a source`);
            if (/fax/i.test(f.label || '') && f.value) fails.push(`${tag}: fax value ${f.value}`);
            if (/[–—]/.test(f.value || '')) fails.push(`${tag}: dash in ${f.field}`);
            if (/291-62|Glendale, CA 91203.*Suite|450 N\.? Brand/i.test(f.value || '') && /atty|attorney|firm/i.test(f.label || '')) fails.push(`${tag}: old office in ${f.field}`);
          }
        } catch (e) {
          // a parcel outside Los Angeles must throw a clear error for BOE-502-D; anything else fails
          fails.push(`${tag}: ${e.message}`);
        }
      }
    }
  }
  console.log(`${n} generations, ${fails.length} problems`);
  fails.slice(0, 50).forEach((f) => console.log('FAIL', f));
  process.exit(fails.length ? 1 : 0);
})();
