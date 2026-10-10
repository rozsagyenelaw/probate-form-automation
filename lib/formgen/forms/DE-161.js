const { embed: embedFont } = require('../fonts');
// DE-161/GC-041 Inventory and Appraisal Attachment (Rev. January 1, 1998).
// One attachment per record: Attachment 1 (cash items appraised by the personal representative,
// Prob. Code 8901) and Attachment 2 (all other assets, appraised by the probate referee, 8902).
// Ten items per page; more items continue on added pages (flattened copies of the same form).
// Character of property is stated per Prob. Code 8850(c). Accounts the client marked joint,
// POD/TOD or trust are left out (not probate assets) and listed as a warning.
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs'); const path = require('path');
const { caption } = require('../header');
const { money } = require('../format');
const { inventoryItems } = require('../admin-helpers');

const ID = 'DE-161';
const P = 'topmostSubform[0].Page1[0].';
const NONPROBATE = /joint|pod|tod|trust/i;
// row r (0 based) -> [itemNo field or null, description, value]
const ROWS = [[null, 'Description[0]', 'AppValue[10]']].concat([...Array(9)].map((_, k) => [`ItemNo[${8 - k}]`, `Description[${9 - k}]`, `AppValue[${8 - k}]`]));

function itemsFor(F, att) {
  return inventoryItems(F).filter((i) => i.att === att && !NONPROBATE.test(i.ownership || ''));
}

function records(F) {
  const out = [];
  if (itemsFor(F, 1).length) out.push({ label: 'Attachment 1 (cash items, appraised by the personal representative)', att: 1 });
  if (itemsFor(F, 2).length) out.push({ label: 'Attachment 2 (appraised by the probate referee)', att: 2 });
  if (!out.length) out.push({ label: 'Attachment 1', att: 1 });
  return out;
}

function character(F, it) {
  const c = F.get('inventory.character', ID, { label: 'Character of the inventoried property (Prob. Code 8850(c)): separate property of the decedent, community property, or mixed (answer per item)', type: 'choice', options: ['separate property', 'community property', 'mixed'] });
  if (c === 'mixed') {
    const per = F.get(`asset.${it.id}.character`, ID, { label: `Character of ${it.description}: separate or community property`, type: 'choice', options: ['separate property', 'community property'] });
    return per ? { value: per, source: F.src(`asset.${it.id}.character`) } : undefined;
  }
  return c ? { value: c, source: F.src('inventory.character') } : undefined;
}

function rowsFor(F, att) {
  return itemsFor(F, att).map((it) => {
    const ch = character(F, it);
    const desc = `${it.description}${ch ? `. ${ch.value === 'community property' ? "Decedent's one-half community property interest" : 'Separate property of the decedent'}.` : ''}`;
    let val;
    if (att === 1) {
      const v = F.get(`asset.${it.id}.dodValue`, ID, { label: `Date-of-death value of ${it.description} (Attachment 1, appraised by the personal representative; the intake figure is the client's estimate)`, type: 'money' });
      val = v !== undefined ? { value: money(v), source: F.src(`asset.${it.id}.dodValue`) } : undefined;
    }
    return { desc: { value: desc, source: `${it.source}${ch ? `; ${ch.source}` : ''}` }, val, need: att === 1 && !val ? `asset.${it.id}.dodValue` : undefined };
  });
}

async function fill(f, F, ctx) {
  caption(f, F);
  const att = ctx.record.att;
  const rows = rowsFor(F, att);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const skipped = inventoryItems(F).filter((i) => NONPROBATE.test(i.ownership || ''));
  if (skipped.length) ctx.warnings.push(`Left out as non-probate (client marked joint, POD/TOD or trust): ${skipped.map((i) => i.description).join('; ')}. Confirm before filing.`);
  f.text(`${P}AttNo[0]`, { value: String(att), source: att === 1 ? 'Cash items (Prob. Code 8901)' : 'Referee items (Prob. Code 8902)' }, { item: 'Header', label: 'Attachment No.' });
  f.text(`${P}PageNo[0]`, { value: '1', source: 'computed' }, { item: 'Header', label: 'Page' });
  f.text(`${P}TotalPP[0]`, { value: String(pages), source: `computed: ${rows.length} items, 10 per page` }, { item: 'Header', label: 'Total pages' });
  fillRows(f, rows.slice(0, 10), 0, att);
  if (pages > 1) ctx.more = { rows, pages, att };
}

function fillRows(f, rows, start, att) {
  ROWS.forEach(([no, d, v], r) => {
    const row = rows[r];
    if (no) f.text(`${P}${no}`, row ? { value: `${start + r + 1}.`, source: 'item number' } : undefined, { item: `Row ${r + 1}`, label: 'Item No.', blankReason: 'no more items' });
    f.text(`${P}${d}`, row ? row.desc : undefined, { item: `Item ${start + r + 1}`, label: 'Description', blankReason: 'no more items' });
    f.text(`${P}${v}`, row ? row.val : undefined, { item: `Item ${start + r + 1}`, label: 'Appraised value', need: row && row.need, blankReason: row ? (att === 2 ? 'Appraised by the probate referee' : '') : 'no more items' });
  });
}

// continuation pages: fill a fresh copy for each further page of ten, flatten it and append
async function after(doc, F, ctx) {
  if (!ctx.more) return;
  const { Filler } = require('../pdf');
  const dir = process.env.FORMGEN_TEMPLATES || path.join(__dirname, '..', '..', '..', 'templates', 'official');
  const font = await embedFont(doc, 'Helvetica');
  for (let p = 1; p < ctx.more.pages; p++) {
    const copy = await PDFDocument.load(fs.readFileSync(path.join(dir, 'DE-161.pdf')));
    const f2 = new Filler(copy, ID);
    caption(f2, F);
    f2.text(`${P}AttNo[0]`, String(ctx.more.att));
    f2.text(`${P}PageNo[0]`, String(p + 1));
    f2.text(`${P}TotalPP[0]`, String(ctx.more.pages));
    fillRows(f2, ctx.more.rows.slice(p * 10, p * 10 + 10), p * 10, ctx.more.att);
    for (const fld of f2.form.getFields()) { if (fld.constructor.name === 'PDFButton') f2.form.removeField(fld); }
    f2.form.flatten();
    const [pg] = await doc.copyPages(copy, [0]);
    doc.addPage(pg);
    // the printed "1." of the first row is replaced by this page's first item number
    pg.drawRectangle({ x: 36, y: 792 - 186.3, width: 22, height: 10, color: rgb(1, 1, 1) });
    pg.drawText(`${p * 10 + 1}.`, { x: 38, y: 792 - 184.5, size: 9, font });
    // the copied page keeps the form's screen-only notice layer: cover it so it never prints
    pg.drawRectangle({ x: 30, y: 0, width: 225, height: 25, color: rgb(1, 1, 1) });
  }
}

module.exports = { id: ID, kind: 'jc', title: 'Inventory and Appraisal Attachment', revision: 'Rev. January 1, 1998', template: 'DE-161.pdf', sourceUrl: 'https://courts.ca.gov/documents/de161.pdf', procedures: ['full', '13151', '13100', '13200'], records, fill, after };
