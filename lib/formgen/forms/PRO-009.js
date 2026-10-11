// LASC PRO 009 Bid In Open Court on Sale of Real Property (SCLAC PRO 009 Rev. 04/26), downloaded
// 2026-10-11 from the LASC probate forms page (lacourt.ca.gov/pages/lp/fo-forms/cp/probate).
// LASC Local Rule 4.39(c) (Local Rules effective July 1, 2026, ch. 4): "When there is a successful
// overbid in open court on a sale of real property, counsel must complete and the successful
// bidder must sign and file a 'Bid In Open Court on Sale of Real Property' form (LASC form PRO 009)."
// Prob. Code 10311(a)(1): an overbid must be at least 10% more on the first $10,000 of the original
// bid and 5% more on the excess. Rozsa decision D7 (decisions section 25): generated with the sale
// hearing packet and labelled for use only if an overbid happens. The bidder's own facts (amount,
// terms, names, vesting, agent) are filled in at the hearing and left blank here.
const { courtFor } = require('../courts');
const { filer } = require('../filer');
const { money, num } = require('../format');
const { prName } = require('../logic');
const { rgb } = require('pdf-lib');

const ID = 'PRO-009';

function records(F) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => ({ label: p.address || `Parcel ${i + 1}`, parcel: p, index: i }));
}

async function fill(f, F, ctx) {
  const k = `sale.${ctx.record.index + 1}`;
  // the LASC form's fields are auto-size: fix the sizes so the caption and lines print normally
  for (const fld of f.form.getFields()) {
    if (fld.constructor.name !== 'PDFTextField') continue;
    const n = fld.getName();
    try { fld.setFontSize(n === '01' ? 8 : 10); } catch (e) { fld.acroField.setDefaultAppearance(`/Helv ${n === '01' ? 8 : 10} Tf 0 g`); }
    for (const w of fld.acroField.getWidgets()) { const mk = w.getAppearanceCharacteristics(); if (mk) { mk.dict.delete(require('pdf-lib').PDFName.of('BC')); } w.dict.delete(require('pdf-lib').PDFName.of('BS')); }
  }
  const fl = filer(F, ID);
  const lines = [fl.name && fl.name.value, fl.street && fl.street.value, fl.cityStateZip && fl.cityStateZip.value, fl.phone && `Tel. ${fl.phone.value}`, fl.email && fl.email.value].filter(Boolean);
  f.text('01', lines.length ? { value: lines.join('\n'), source: 'Petitioner (self-represented) from the case file' } : undefined, { item: 'Caption', label: 'Party without attorney', need: 'petitioner.name' });
  f.text('02', undefined, { item: 'Caption', label: 'State Bar number', blankReason: 'Self-represented petitioner' });
  f.text('03', fl.attorneyFor, { item: 'Caption', label: 'Attorney for' });
  const c = courtFor(F, ID);
  f.text('04', c.street ? { value: `${c.street}, ${c.cityZip}`, source: c.source } : undefined, { item: 'Caption', label: 'Courthouse address', need: c.need || 'court.county' });
  const dn = F.v('decedent.name', ID);
  f.text('05', dn ? { value: `${dn.value}, Decedent`, source: dn.source } : undefined, { item: 'Caption', label: 'Estate of', need: 'decedent.name' });
  f.text('06', F.v('case.number', ID), { item: 'Caption', label: 'Case number', need: 'case.number' });
  const P = ctx.record.parcel;
  f.text('08', P.address ? { value: `${P.address}${P.apn ? ` (APN ${P.apn})` : ''}`, source: `case.assets.realProperty[${ctx.record.index}]` } : undefined, { item: 'Property', label: 'Property described', need: `${k}.address` });
  for (const [n, l] of [['07', 'Amount offered'], ['09', 'Terms of sale'], ['10', 'Name(s) of purchaser(s)'], ['11', 'Title held as'], ['13', 'Commission division'], ['14', 'Date'], ['17', 'Print name of bidder']]) f.text(n, undefined, { item: 'Bid', label: l, blankReason: 'Filled in by the bidder at the hearing, only if an overbid happens' });
  const pr = prName(F, ID);
  f.text('16', pr ? { value: pr.value, source: pr.source } : undefined, { item: 'Signatures', label: 'Estate representative', need: 'petitioner.name' });
  const bid = F.opt(`${k}.amountBid`);
  if (bid !== undefined) {
    const b = num(bid); const min = b + Math.min(b, 10000) * 0.10 + Math.max(0, b - 10000) * 0.05;
    ctx.warnings.push(`PRO 009: use only if someone overbids at the hearing. The lowest overbid the court can accept is $${money(min)} (Prob. Code 10311(a)(1), on the original bid of $${money(b)}).`);
  }
}

async function after(doc, F) {
  const font = await require('../fonts').embed(doc, 'HelveticaBold');
  const page = doc.getPages()[0]; const { width, height } = page.getSize();
  const t = 'USE ONLY IF AN OVERBID HAPPENS AT THE SALE HEARING';
  const size = 11; const w = font.widthOfTextAtSize(t, size);
  page.drawRectangle({ x: (width - w) / 2 - 8, y: height - 42, width: w + 16, height: 18, borderColor: rgb(0, 0.3, 0.7), borderWidth: 1 });
  page.drawText(t, { x: (width - w) / 2, y: height - 37, size, font, color: rgb(0, 0.3, 0.7) });
  void F;
}

module.exports = { id: ID, kind: 'jc', title: 'LASC Bid In Open Court on Sale of Real Property (only if an overbid happens)', revision: 'SCLAC PRO 009 Rev. 04/26', template: 'PRO-009.pdf', sourceUrl: 'https://lascpubstorage.blob.core.windows.net/forms/Forms%20Comprehensive%20List/LASC%20PRO%20009.pdf', procedures: ['full'], records, fill, after };
