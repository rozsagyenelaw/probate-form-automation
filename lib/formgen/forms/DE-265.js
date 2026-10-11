// DE-265/GC-065 Order Confirming Sale of Real Property (Rev. January 1, 2015). Prob. Code 10313.
// A proposed order: the court makes the findings at the hearing. Prefilled only from the case
// file and the sale answers given for DE-260 (same keys sale.N.*). Items the court decides at
// the hearing (overbid result, judge's date) are left blank.
const { header, caption } = require('../header');
const { fmtDate, money } = require('../format');
const { capacity, prName } = require('../logic');

const ID = 'DE-265';
const P1 = 'topmostSubform[0].Page1[0].';
const P2 = 'topmostSubform[0].Page2[0].';

function records(F) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => ({ label: p.address || `Parcel ${i + 1}`, parcel: p, index: i }));
}

async function fill(f, F, ctx) {
  const k = `sale.${ctx.record.index + 1}`;
  const q = (key, label, type, options) => F.get(`${k}.${key}`, ID, { label: `Sale of ${ctx.record.label}: ${label}`, type, options });
  const s = (key) => F.src(`${k}.${key}`);
  const P = ctx.record.parcel;
  const cap = capacity(F, ID); const pr = prName(F, ID);
  header(f, F, { attorneyFor: pr && cap ? { value: `${cap.value.replace(/^\w/, (c) => c.toUpperCase())} ${pr.value}`, source: `${cap.source}; ${pr.source}` } : undefined });
  caption(f, F, { estateFields: [`${P1}EJHeader_sf[0].Party_sf[0].Party_ft[0]`, `${P2}PxHeader[0].Party_sf[0].Party_ft[0]`], caseFields: [`${P1}EJHeader_sf[0].CaseNumber_sf_sf[0].CaseNumber_ft[0]`, `${P2}PxHeader[0].CaseNumber_ft[0]`] });
  f.check(`${P1}EJHeader_sf[0].Party_sf[0].EstateOf_cb[0]`, true, { item: 'Caption', label: 'Estate of', source: 'decedent estate' });
  f.check(`${P2}PxHeader[0].Party_sf[0].EstateOf_cb[0]`, true, { item: 'Caption', label: 'Estate of', source: 'decedent estate' });
  f.check(`${P1}EJHeader_sf[0].Party_sf[0].Decedent_cb[0]`, true, { item: 'Caption', label: 'Decedent', source: 'decedent estate' });
  const unit = q('soldAsUnit', 'Was other property sold as a unit with the real property? (yes/no)', 'yesno');
  f.check(`${P1}EJHeader_sf[0].Title_sf[0].#area[0].Estate[0]`, unit, { item: 'Title', label: 'and Confirming Sale of Other Property as a Unit', source: s('soldAsUnit'), need: `${k}.soldAsUnit` });
  // 1. hearing (from the sale answers)
  const hd = q('hearingDate', 'Hearing date on the petition to confirm the sale', 'date');
  f.text(`${P1}FillText55[0]`, hd ? { value: fmtDate(hd), source: s('hearingDate') } : undefined, { item: '1', label: 'Hearing date', need: `${k}.hearingDate` });
  f.text(`${P1}FillText56[0]`, F.opt(`${k}.hearingTime`) ? F.v(`${k}.hearingTime`) : undefined, { item: '1', label: 'Time', blankReason: 'Not in file' });
  f.text(`${P1}FillText57[0]`, F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: '1', label: 'Dept.', blankReason: 'Not in file' });
  f.text(`${P1}FillText58[0]`, F.opt('hearing.room') ? F.v('hearing.room') : undefined, { item: '1', label: 'Rm.', blankReason: 'Not in file' });
  // 3. authority or good reason
  const notice = F.opt(`${k}.noticeOfSale`);
  const willSale = notice === 'will authorizes sale' || notice === 'will directs sale';
  f.check(`${P1}CheckBox19[0]`, notice === undefined ? undefined : willSale, { item: '3a', label: 'Sale authorized or directed by the will', source: s('noticeOfSale'), need: `${k}.noticeOfSale` });
  if (notice === undefined) F.need(`${k}.noticeOfSale`, ID, { label: `Sale of ${ctx.record.label}: notice of sale: published, posted, will authorizes sale, or will directs sale`, type: 'choice', options: ['published', 'posted', 'will authorizes sale', 'will directs sale'] });
  f.check(`${P1}CheckBox18[0]`, notice === undefined ? undefined : !willSale, { item: '3b', label: 'Good reason existed for the sale', source: s('noticeOfSale') });
  f.text(`${P1}FillText59[0]`, P.address ? { value: `${P.address}${P.apn ? `, APN ${P.apn}` : ''}`, source: `case.assets.realProperty[${ctx.record.index}].address/apn` } : undefined, { item: '3', label: 'Property commonly described as', need: `${k}.address` });
  const kind = q('saleKind', 'Private sale or public auction?', 'choice', ['private', 'public']);
  f.check(`${P1}CheckBox17[0]`, kind === undefined ? undefined : kind === 'private', { item: '6', label: 'Private sale: bid is 90% or more of appraisal within one year', source: s('saleKind') });
  f.check(`${P1}CheckBox16[0]`, undefined, { item: '7', label: 'Higher offer cannot be obtained', blankReason: 'Decided at the hearing' });
  f.check(`${P1}CheckBox16[1]`, undefined, { item: '7', label: 'Higher offer obtained in open court', blankReason: 'Decided at the hearing' });
  f.check(`${P1}CheckBox14[0]`, true, { item: '8', label: 'personal representative', source: 'decedent estate' });
  // 9. confirmation
  f.check(`${P1}CheckBox10[0]`, false, { item: '9', label: 'Legal description in item 15', source: 'Legal description goes on Attachment 9' });
  f.check(`${P1}CheckBox8[0]`, true, { item: '9', label: 'Legal description on Attachment 9', source: 'Attach the legal description' });
  { const P = ctx.record.parcel || ((F.caseData.assets || {}).realProperty || [])[ctx.record.index || 0] || {};
    const ld = require('../admin-helpers').legalDescription(F, ID, P, ctx.record.index || 0);
    ctx.att9 = [['Street address', P.address || '[ANSWER NEEDED: address]'], ["Assessor's Parcel Number", P.apn || '[ANSWER NEEDED: APN]'], ['Legal description', ld ? ld.value : '[ANSWER NEEDED: legal description from the deed or title report]']];
    f.info('Attachment 9', ld ? ld.value : '(legal description needed)', { item: '9', label: 'Attachment 9: legal description', source: ld ? ld.source : 'NEEDS ANSWER' }); }
  f.check(`${P1}CheckBox11[0]`, unit === undefined ? undefined : !!unit, { item: '9', label: 'and other property sold as a unit', source: s('soldAsUnit') });
  f.check(`${P1}CheckBox9[0]`, false, { item: '9', source: 'not used' });
  f.check(`${P1}CheckBox7[0]`, !!unit, { item: '9', label: 'other property on Attachment 9', source: s('soldAsUnit') });
  const buyer = q('purchaser', 'Purchaser name(s) and manner of vesting title', 'text');
  const parts = buyer ? String(buyer).split(/,\s*/) : [];
  f.text(`${P1}FillText60[0]`, buyer ? { value: parts[0], source: s('purchaser') } : undefined, { item: '9', label: 'Confirmed to (name)', need: `${k}.purchaser` });
  f.text(`${P1}FillText61[0]`, buyer && parts.length > 1 ? { value: parts.slice(1).join(', '), source: s('purchaser') } : undefined, { item: '9', label: 'Manner of vesting title', blankReason: 'Not stated separately' });
  const bid = q('amountBid', 'Amount of the accepted bid', 'money');
  f.text(`${P1}FillText62[0]`, bid !== undefined ? { value: money(bid), source: s('amountBid') } : undefined, { item: '9', label: 'Sale price', need: `${k}.amountBid` });
  const pay = F.opt(`${k}.payment`);
  f.text(`${P1}FillText63[0]`, pay ? { value: pay === 'cash' ? 'Cash' : `Credit: ${F.opt(`${k}.creditTerms`) || '[ANSWER NEEDED: credit terms]'}`, source: s('payment') } : undefined, { item: '9', label: 'Terms', blankReason: 'Not in file' });
  f.check(`${P1}CheckBox2[0]`, false, { item: '9', source: 'not needed' });
  f.check(`${P1}CheckBox5[0]`, false, { item: '9', source: 'not needed' });
  f.check(`${P1}CheckBox3[0]`, true, { item: '10', label: 'personal representative', source: 'decedent estate' });
  f.text(`${P1}FillText6115[0]`, pr, { item: '10', label: 'Name of PR', need: 'petitioner.name' });
  f.check(`${P1}CheckBox1[0]`, !!unit, { item: '10', label: 'and other property sold as a unit', source: s('soldAsUnit') });
  // 11. bond
  const addBond = F.opt(`${k}.additionalBond`);
  const notReq = addBond !== undefined && /not required|^0$|none/i.test(String(addBond));
  f.check(`${P2}CheckBox37[0]`, addBond === undefined ? undefined : notReq, { item: '11a', label: 'No additional bond', source: s('additionalBond'), need: `${k}.additionalBond` });
  if (addBond === undefined) F.need(`${k}.additionalBond`, ID, { label: `Sale of ${ctx.record.label}: additional bond: "not required" or the amount`, type: 'text' });
  f.check(`${P2}CheckBox36[0]`, addBond === undefined ? undefined : !notReq, { item: '11b', label: 'Additional bond required', source: s('additionalBond') });
  f.text(`${P2}FillText66[0]`, addBond !== undefined && !notReq ? { value: money(addBond), source: s('additionalBond') } : undefined, { item: '11b', label: 'Amount', blankReason: 'Not required' });
  const blocked = F.opt(`${k}.blockedAccount`); const hasB = !!blocked && !/^none$/i.test(blocked);
  f.check(`${P2}CheckBox35[0]`, hasB, { item: '11c', label: 'Blocked account', source: hasB ? s('blockedAccount') : 'none in file' });
  f.text(`${P2}FillText67[0]`, hasB ? F.v(`${k}.blockedAccount`) : undefined, { item: '11c', label: 'Institution and location', blankReason: 'No blocked account' });
  // 12. commission
  const broker = F.opt(`${k}.broker`); const hasBroker = broker !== undefined && !/^none$/i.test(String(broker).trim());
  const pct = F.opt(`${k}.commissionPercent`);
  f.check(`${P2}CheckBox34[0]`, broker === undefined ? undefined : !hasBroker, { item: '12a', label: 'No commission', source: s('broker') });
  f.check(`${P2}CheckBox33[0]`, broker === undefined ? undefined : hasBroker, { item: '12b', label: 'Commission approved', source: s('broker') });
  const comm = hasBroker && pct && bid !== undefined ? Number(String(pct).replace('%', '')) / 100 * Number(bid) : undefined;
  f.text(`${P2}FillText69[0]`, comm !== undefined ? { value: money(comm), source: `computed: ${pct}% of the sale price (${s('commissionPercent')})` } : undefined, { item: '12b', label: 'Commission amount', blankReason: hasBroker ? 'Set at the hearing' : 'No broker' });
  f.text(`${P2}FillText68[0]`, hasBroker ? { value: F.opt(`${k}.commissionSplit`) || `To ${broker}`, source: F.opt(`${k}.commissionSplit`) ? s('commissionSplit') : s('broker') } : undefined, { item: '12b', label: 'To be paid as follows', blankReason: 'No broker' });
  f.text(`${P2}FillText70[0]`, undefined, { item: '13', label: 'Other', blankReason: 'None' });
  f.text(`${P2}FillText75[0]`, undefined, { item: '14', label: 'Pages attached', blankReason: 'Count after Attachment 9' });
  f.text(`${P2}T100[0]`, undefined, { item: 'Judge', label: 'Date', blankReason: 'Dated by the judge' });
  for (const n of ['CheckBox300[0]', 'CheckBox31[0]', 'CheckBox28[0]', 'CheckBox30[0]', 'CheckBox29[0]', 'CheckBox27[0]']) f.check(`${P2}${n}`, false, { item: '15', source: 'Attachment 9 used instead of item 15' });
  f.text(`${P2}FillText1[0]`, undefined, { item: '15', blankReason: 'Attachment 9 used' });
  f.text(`${P2}FillText73[0]`, undefined, { item: 'Clerk', blankReason: 'Clerk certificate' });
  ctx.warnings.push('Item 7 (overbids) is decided at the hearing; if there is an overbid, the buyer and price on this order change to the successful overbidder (see PRO 009).');
}

async function after(doc, F, ctx) {
  const { appendTableAttachment } = require('../attach');
  if (ctx.att9) await appendTableAttachment(doc, { estate: String(F.opt('decedent.name') || ''), caseNumber: String(F.opt('case.number') || ''), formId: ID, title: 'ATTACHMENT 9', intro: 'Legal description of the real property (LASC Local Rule 4.29(d)(3)).', columns: [{ title: 'Item', width: 150 }, { title: 'Description', width: 390 }], rows: ctx.att9 });
}

module.exports = { id: ID, kind: 'jc', title: 'Order Confirming Sale of Real Property', revision: 'Rev. January 1, 2015', template: 'DE-265.pdf', sourceUrl: 'https://courts.ca.gov/documents/de265.pdf', procedures: ['full'], records, fill, after };
