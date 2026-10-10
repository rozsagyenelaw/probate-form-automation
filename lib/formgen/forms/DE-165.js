// DE-165 Notice of Proposed Action, Objection and Consent (Rev. January 1, 1998).
// Prob. Code 10580 to 10592. One notice per proposed action (case.proposedActions[]); with none
// recorded, one notice whose action, date and terms are all attorney answers. The action is
// never invented. The objection and consent sections on page 2 are left for the recipient.
const { header, caption, petitionerFor } = require('../header');
const { fmtDate, money, addDays } = require('../format');
const { prName } = require('../logic');
const { S } = require('../facts');

const ID = 'DE-165';
const P1 = 'DE-165[0].Page1[0].';
const P2 = 'DE-165[0].Page2[0].';

function records(F) {
  const list = Array.isArray(F.caseData.proposedActions) ? F.caseData.proposedActions : [];
  if (!list.length) return [{ label: 'New proposed action (describe it in the answers)', key: 'nopa.1', data: {} }];
  return list.map((a, i) => ({ label: S(a.title || a.description).slice(0, 60) || `Proposed action ${i + 1}`, key: `nopa.${i + 1}`, data: a, idx: i }));
}

function val(F, rec, field, label, type) {
  const d = rec.data[field];
  if (d !== undefined && d !== null && d !== '') return { value: d, source: `case.proposedActions[${rec.idx}].${field}` };
  const v = F.get(`${rec.key}.${field}`, ID, { label, type });
  return v === undefined ? undefined : { value: v, source: F.src(`${rec.key}.${field}`) };
}

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const rec = ctx.record;
  const T = `${P1}StdP1Header_sf[0].FormTitle[0].#area[0].`;
  f.check(`${T}ch[0]`, false, { item: 'Title', label: 'Objection', source: 'This is the notice (recipient checks when objecting)' });
  f.check(`${T}ch[1]`, false, { item: 'Title', label: 'Consent', source: 'This is the notice (recipient checks when consenting)' });
  const pr = prName(F, ID);
  f.text(`${P1}TextField2[0]`, pr, { item: '1', label: 'Personal representative (names)', need: 'petitioner.name' });
  const iaea = F.get('petition.iaeaAuthority', ID);
  f.check(`${P1}Authority[0]`, iaea === undefined ? undefined : iaea === 'full', { item: '2a', label: 'Full IAEA authority', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  f.check(`${P1}Authority[1]`, iaea === undefined ? undefined : iaea === 'limited', { item: '2b', label: 'Limited IAEA authority', source: F.src('petition.iaeaAuthority') });
  if (iaea === 'none') ctx.warnings.push('No IAEA authority in the file: a Notice of Proposed Action is only used with IAEA authority (Prob. Code 10580).');
  const date = val(F, rec, 'date', 'Date on or after which the proposed action will be taken (at least 15 days after the notice is mailed or delivered, Prob. Code 10586)', 'date');
  f.text(`${P1}DateField1[0]`, date ? { value: fmtDate(date.value), source: date.source } : undefined, { item: '3', label: 'On or after (date)', need: `${rec.key}.date` });
  const desc = val(F, rec, 'description', 'Proposed action, described in specific terms (for a sale: buyer, price, terms, and any broker commission, Prob. Code 10585)', 'text');
  f.text(`${P1}TEXT\\.0\\.19\\.0[0]`, desc, { item: '3', label: 'Proposed action', need: `${rec.key}.description` });
  f.check(`${P1}Three[0]`, false, { item: '3', label: 'Described in Attachment 3', source: 'Described in item 3' });
  const real = val(F, rec, 'isRealProperty', 'Is the proposed action a sale or exchange of, or an option to purchase, real property?', 'yesno');
  const isReal = real ? (real.value === true || real.value === 'yes') : undefined;
  f.check(`${P1}Four[0]`, isReal, { item: '4', label: 'Real property transaction', source: real && real.source, need: `${rec.key}.isRealProperty` });
  if (isReal) {
    const inv = val(F, rec, 'inventoryValue', 'Value of the property in the probate inventory (or "none" if no inventory yet)', 'text');
    const none = inv && /^none$/i.test(String(inv.value).trim());
    f.text(`${P1}DecimalField1[0]`, inv && !none ? { value: money(inv.value), source: inv.source } : undefined, { item: '4b', label: 'Inventory value', need: `${rec.key}.inventoryValue`, blankReason: none ? 'No inventory yet' : '' });
    f.check(`${P1}FourB[0]`, inv ? !!none : undefined, { item: '4b', label: 'No inventory yet', source: inv && inv.source });
  } else {
    f.text(`${P1}DecimalField1[0]`, undefined, { item: '4b', blankReason: 'Not a real property transaction' });
    f.check(`${P1}FourB[0]`, false, { item: '4b', source: 'Not a real property transaction' });
  }
  // 5a: where objections go; 7: who to call
  const to = 'personal representative'; // self-represented: objections go to the personal representative
  let addr;
  if (to === 'personal representative') { const pa = F.opt('petitioner.address'); const { oneLineAddress } = require('../facts'); addr = pr && pa ? { value: `${pr.value}, ${oneLineAddress(pa)}`, source: `${pr.source}; ${F.src('petitioner.address')}` } : undefined; if (!pa) F.need('petitioner.address', ID); }
  f.text(`${P2}TextField2[0]`, addr, { item: '5a', label: 'Name and address for objections', need: 'petitioner.address' });
  f.text(`${P2}TextField2[1]`, pr, { item: '7', label: 'For information call (name)', need: 'petitioner.name' });
  f.text(`${P2}TextField3[0]`, F.v('petitioner.phone', ID), { item: '7', label: 'Telephone', need: 'petitioner.phone' });
  f.text(`${P2}HearingDate[0]`, undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated when signed' });
  f.text(`${P2}T14[0]`, pr ? { value: pr.value, source: pr.source } : undefined, { item: 'Signature', label: 'Name of personal representative or attorney', need: 'petitioner.name' });
  for (const [i, lab] of [[1, 'Objection'], [2, 'Consent']]) {
    f.text(`${P2}HearingDate[${i}]`, undefined, { item: lab, blankReason: 'Completed by the recipient' });
    f.text(`${P2}T14[${i}]`, undefined, { item: lab, blankReason: 'Completed by the recipient' });
  }
  f.check(`${P2}CheckBox61[1]`, false, { item: 'Objection', label: 'I OBJECT', source: 'Completed by the recipient' });
  f.check(`${P2}CheckBox61[0]`, false, { item: 'Consent', label: 'I CONSENT', source: 'Completed by the recipient' });
  ctx.warnings.push('Mail or deliver to each person listed in Prob. Code 10581 at least 15 days before the date in item 3 (Prob. Code 10586).');
  void addDays;
}

module.exports = { id: ID, kind: 'jc', title: 'Notice of Proposed Action', revision: 'Rev. January 1, 1998', template: 'DE-165.pdf', sourceUrl: 'https://courts.ca.gov/documents/de165.pdf', procedures: ['full'], records, fill };
