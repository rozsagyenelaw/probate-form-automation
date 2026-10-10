// Builds the approval sample set for Rozsa (item 61):
//   <OUT>/<NN>-<form>[-rN]/filled.pdf, filled-p<n>.png, blank-p<n>.png, fields.csv
//   <OUT>/TABLE.csv (form, revision, item, field, label, source data, value) for every form
//   <OUT>/index.html (one page to review everything)
// Fictional test case only (Test Decedent, Los Angeles County). Every PDF is watermarked DRAFT.
// Usage: node scripts/sample-set.js <OUT>
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { generate, listForms, REGISTRY } = require('../lib/formgen');

const OUT = process.argv[2];
const FX = path.join(__dirname, '../test/fixtures');
const TPL = path.join(__dirname, '../templates/official');
const SRC = path.join(__dirname, '../templates/source');
const read = (f) => JSON.parse(fs.readFileSync(path.join(FX, f)));
const answers = { ...read('answers-group-b.json'), ...read('answers-admin.json'), ...read('answers-full.json'), ...read('answers-sale.json') };
const adminRecords = read('admin-records.json');

const RUNS = [
  { title: 'Full probate (Los Angeles, will, executor)', caseFile: 'test-case.json', extraCase: adminRecords,
    forms: ['WILL-LODGING', 'DE-111', 'DE-142', 'DE-121', 'DE-140', 'DE-147', 'DE-147S', 'DE-150', 'DE-157', 'NOTICE-9202-DHCS', 'NOTICE-9202-FTB', 'NOTICE-9202-CALVCB', 'NOTICE-9202-DCSS', 'DE-160', 'DE-161', 'BOE-502-D', 'DE-165', 'NOTICE-OF-SALE', 'DE-260', 'DE-120-SALE', 'DE-265', 'DE-174', 'PETITION-FINAL-DISTRIBUTION', { id: 'DE-120', extra: { purpose: 'final' } }, 'ORDER-FINAL-DISTRIBUTION', 'DE-295'] },
  { title: 'Primary residence petition (Prob. Code 13151)', caseFile: 'test-case-13151.json', forms: ['DE-310', { id: 'DE-120', extra: { purpose: '13151' } }, 'DE-315', 'DE-160', 'DE-161'] },
  { title: 'Spousal property petition (Prob. Code 13650)', caseFile: 'test-case-spousal.json', forms: ['DE-221', { id: 'DE-120', extra: { purpose: '13650' } }, 'DE-226'] },
  { title: 'Small estate affidavit (Prob. Code 13100)', caseFile: 'test-case-small.json', forms: ['SMALL-ESTATE-AFFIDAVIT'] },
  { title: 'Real property of small value (Prob. Code 13200)', caseFile: 'test-case-13200.json', forms: ['DE-305'] },
];

const csvq = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' / ')}"`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sha1 = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
function pngs(pdf, prefix, dir) {
  execFileSync('pdftoppm', ['-r', '80', '-png', pdf, path.join(dir, prefix)]);
  return fs.readdirSync(dir).filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.png')).sort((a, b) => Number(a.match(/-(\d+)\.png$/)[1]) - Number(b.match(/-(\d+)\.png$/)[1]));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const table = [['run', 'form', 'record', 'revision', 'page', 'item', 'field', 'label', 'source data', 'value'].map(csvq).join(',')];
  const html = [];
  let n = 0;
  for (const run of RUNS) {
    const caseData = { ...read(run.caseFile), ...(run.extraCase || {}) };
    html.push(`<h2>${esc(run.title)}</h2><p class="m">Test case: ${esc(run.caseFile)} (fictional)</p>`);
    const meta = Object.fromEntries(listForms(caseData, answers).map((m) => [m.id, m]));
    for (const entry of run.forms) {
      const id = typeof entry === 'string' ? entry : entry.id;
      const extraBase = typeof entry === 'string' ? {} : entry.extra;
      const m = meta[id]; const spec = REGISTRY.FORMS[id];
      if (!m) { html.push(`<p class="bad">${esc(id)}: not built</p>`); continue; }
      const recs = m.records && m.records.length ? m.records : [null];
      for (const r of recs) {
        n += 1;
        const extra = { ...extraBase, ...(r ? { record: r.index } : {}) };
        const name = `${String(n).padStart(2, '0')}-${id}${r ? `-r${r.index + 1}` : ''}${extraBase.purpose ? `-${extraBase.purpose}` : ''}`;
        const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
        const full = await generate({ formId: id, caseData, answers, extra, approved: false });
        const intakeOnly = await generate({ formId: id, caseData, answers: {}, extra, approved: false }).catch(() => null);
        fs.writeFileSync(path.join(dir, 'filled.pdf'), full.pdfBytes);
        const filledPngs = pngs(path.join(dir, 'filled.pdf'), 'filled', dir);
        let blankPngs = []; let tplInfo = '';
        if (spec.kind === 'jc') {
          const tpl = path.join(TPL, spec.template);
          blankPngs = pngs(tpl, 'blank', dir);
          const srcFile = path.join(SRC, spec.template);
          const filledFields = full.fields.length;
          tplInfo = `Template: official blank ${esc(spec.template)}${fs.existsSync(srcFile) ? `, SHA-1 of the courts.ca.gov download ${sha1(srcFile)}` : ''}; fields in blank and in filled form: ${filledFields} (field-by-field list below).`;
        } else tplInfo = 'Generated document (no Judicial Council form exists).';
        const rows = full.fields;
        fs.writeFileSync(path.join(dir, 'fields.csv'), [['page', 'item', 'field', 'label', 'source data', 'value'].map(csvq).join(','), ...rows.map((f) => [f.page || '', f.item, f.field, f.label, f.source, f.value].map(csvq).join(','))].join('\n'));
        for (const f of rows) table.push([run.title, id, r ? r.label : '', full.revision, f.page || '', f.item, f.field, f.label, f.source, f.value].map(csvq).join(','));
        const used = rows.filter((f) => f.value);
        const needsI = intakeOnly ? intakeOnly.needs : [];
        html.push(`<section><h3>${esc(id)}: ${esc(full.title)}${r ? ` (${esc(r.label)})` : ''}${extraBase.purpose ? ` [${esc(extraBase.purpose)}]` : ''}</h3>
<p class="m">Revision: ${esc(full.revision)}${full.sourceUrl ? ` · <a href="${esc(full.sourceUrl)}">${esc(full.sourceUrl)}</a>` : ''} · folder <code>${esc(name)}</code></p>
<p class="m">${tplInfo}</p>
${full.warnings.length ? `<ul class="w">${full.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
<details><summary>With intake data only, the generator asks ${needsI.length} question(s)</summary><ul>${needsI.map((q) => `<li>${esc(q.question)} <code>${esc(q.key)}</code></li>`).join('')}</ul></details>
<p class="m">This sample adds fictional answers; open questions left: ${full.needs.length}${full.needs.length ? ` (${full.needs.map((q) => esc(q.key)).join(', ')})` : ''}</p>
<div class="pages">${filledPngs.map((p, i) => `<figure><a href="${esc(name)}/${p}"><img src="${esc(name)}/${p}" loading="lazy" alt="${esc(id)} filled page ${i + 1}"></a><figcaption>filled p${i + 1}</figcaption></figure>${blankPngs[i] ? `<figure><a href="${esc(name)}/${blankPngs[i]}"><img src="${esc(name)}/${blankPngs[i]}" loading="lazy" alt="${esc(id)} blank page ${i + 1}"></a><figcaption>blank p${i + 1}</figcaption></figure>` : ''}`).join('')}</div>
<details><summary>${used.length} filled values of ${rows.length} fields (table)</summary><table><tr><th>Page</th><th>Item</th><th>Field</th><th>Value</th><th>Source data</th></tr>${rows.map((f) => `<tr class="${f.value ? '' : 'e'}"><td>${esc(f.page || '')}</td><td>${esc(f.item)}</td><td>${esc(f.label)}<br><code>${esc(f.field)}</code></td><td>${esc(f.value)}</td><td>${esc(f.source)}</td></tr>`).join('')}</table></details></section>`);
        console.log(name, 'fields', rows.length, 'filled', used.length, 'needs(intake only)', needsI.length, 'needs(sample)', full.needs.length);
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'TABLE.csv'), table.join('\n'));
  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Forms sample set</title>
<style>:root{--bg:#fff;--fg:#1d1d1f;--mut:#555;--line:#ddd;--warn:#fff7e0}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#16171a;--fg:#eee;--mut:#aaa;--line:#333;--warn:#3a3218}}
body{background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;max-width:1200px;margin:0 auto;padding:16px}
.m{color:var(--mut);font-size:13px}.w{background:var(--warn);padding:8px 8px 8px 28px;border-radius:6px;font-size:13px}.bad{color:#b00}
section{border-top:1px solid var(--line);padding:12px 0}.pages{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:200px}figure img{width:100%;border:1px solid var(--line)}figcaption{font-size:12px;color:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid var(--line);padding:3px 5px;vertical-align:top;text-align:left}tr.e td{color:var(--mut)}code{font-size:11px;word-break:break-all}
</style></head><body><h1>Court forms: sample set for approval</h1>
<p>HOLD FOR ME. Fictional test case (Test Decedent, Los Angeles County). Every PDF is marked DRAFT - NOT FOR FILING. Nothing here has been sent to anyone. For each form: the current Judicial Council revision, the filled PDF beside the blank revision page by page, the questions the generator asks when only the intake answers exist, and every field with its value and the source of that value. TABLE.csv has all fields of all forms in one sheet.</p>
${html.join('\n')}</body></html>`);
  console.log('done', n, 'documents');
})().catch((e) => { console.error(e); process.exit(1); });
