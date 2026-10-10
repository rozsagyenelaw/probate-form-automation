// [Proposed] Order Settling First and Final Report on Waiver of Account and for Final
// Distribution, on the office pleading paper. No Judicial Council form exists.
// Contents per Prob. Code 11603(b) (distributees and the share of each; conditions), 11603(c)
// (alternate distributees when whereabouts unknown), 11640(b) (21135 / 6409 questions), and the
// compensation allowed under 10800 / 10810.
const { buildPleading } = require('../pleading');
const { docFields } = require('../docfields');
const { heirs } = require('../people');
const { capacity, prName } = require('../logic');
const { statutoryFee } = require('../fees');
const { longDate, money, num } = require('../format');

const ID = 'ORDER-FINAL-DISTRIBUTION';

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name', item: 'Caption' });
  const cap = capacity(F, ID);
  const capText = cap ? cap.value : '[ANSWER NEEDED: capacity]';
  const pr = prName(F, ID);
  const prText = pr ? pr.value : '[ANSWER NEEDED: personal representative]';
  const county = F.opt('court.county') || '[ANSWER NEEDED: county]';
  const caseNo = F.opt('case.number');
  const hd = d.raw('final.hearingDate', { label: 'Hearing date on the petition for final distribution', type: 'date', item: 'Caption' });
  const hearing = { date: hd ? longDate(hd) : '', time: F.opt('final.hearingTime') || '', dept: F.opt('hearing.dept') || '' };
  // no attorney compensation of any kind; the PR's commission only if the client asked for it
  const prAsks = F.get('final.prRequestsCompensation', ID, { label: 'Does the personal representative ask the court for the statutory commission (Probate Code 10800)? (client choice, yes or no)', type: 'yesno' });
  const { sales } = require('../logic');
  const sold = sales(F).filter((x) => x.sold && x.gainLoss !== undefined);
  const inv = F.opt('final.inventoryTotal'); const receipts = F.opt('final.receipts');
  const gains = F.opt('final.gainsOnSales') !== undefined ? F.opt('final.gainsOnSales') : (sold.length ? sold.reduce((t, x) => t + Math.max(0, x.gainLoss), 0) : undefined);
  const losses = F.opt('final.lossesOnSales') !== undefined ? F.opt('final.lossesOnSales') : (sold.length ? sold.reduce((t, x) => t + Math.max(0, -x.gainLoss), 0) : undefined);
  const base = prAsks === true && [inv, gains, receipts, losses].every((x) => x !== undefined) ? num(inv) + num(gains) + num(receipts) - num(losses) : undefined;
  const fee = base !== undefined ? statutoryFee(base).fee : undefined;
  if (fee !== undefined) d.calc('final.statutoryFee', 'Personal representative statutory commission (10800)', money(fee), 'computed under Prob. Code 10800 on inventory + gains + receipts - losses (sales in the file)', '3');
  else if (prAsks === true) F.need('final.inventoryTotal', ID);
  const title = `[Proposed] Order Settling First and Final Report of ${String(capText).replace(/\b\w/g, (c) => c.toUpperCase())} on Waiver of Account and for Final Distribution`;
  const doc = await buildPleading({
    title, footer: `ORDER FOR FINAL DISTRIBUTION - Estate of ${String(name)}, CASE NO. ${caseNo || '________'}`,
    partyBlock: require('../filer').partyLines(F, ID),
    attorneyFor: `Petitioner, ${capText}, self-represented`,
    county, caseNumber: caseNo || '', hearing,
    captionLeft: ['In the Matter of the Estate of', '', `${String(name)},`, '', 'Deceased.'],
    build: async (p) => {
      const P = (t) => p.para(t);
      P(`The First and Final Report of ${prText}, as ${capText} of the estate of ${name}, on Waiver of Account and Petition for Final Distribution came on regularly for hearing on ${hd ? longDate(hd) : '[hearing date]'}, in Department ${hearing.dept || '[ ]'} of this Court. The Court finds that notice of hearing was given as required by law, that all allegations of the petition are true, and that the estate is in a condition to be closed.`);
      P('IT IS ORDERED:');
      P(`1. The First and Final Report of the ${capText} is settled, allowed and approved, and all acts and proceedings of the ${capText} are confirmed and approved.`);
      P(`2. Each person entitled to distribution has waived the account under Probate Code section 10954.`);
      P(prAsks === true ? `3. The ${capText} is allowed statutory compensation of ${fee !== undefined ? `$${money(fee)}` : '[ANSWER NEEDED: amount]'} under Probate Code section 10800 and is authorized to pay it from the estate. No attorney compensation is requested or allowed.` : '3. No statutory compensation is requested by the personal representative, and no attorney compensation is requested or allowed.');
      P(`4. The ${capText} is authorized to hold back ${d.t('final.reserve', { label: 'Reserve for closing expenses', type: 'money', money: true, item: '4' })} for closing expenses, and to distribute any unused balance to the distributees in the shares stated below.`);
      P(`5. The residue of the estate, including the following property and any other property of the estate now known or later discovered, is distributed to the following persons in the following shares: ${d.t('final.propertyOnHand', { label: 'Property on hand for distribution (each item, with legal description and APN for real property)', item: '5' })}.`);
      const unsold = sales(F).filter((x) => !x.sold);
      for (const x of unsold) {
        const ld = d.t('property.legalDescription', { label: `Legal description of the real property at ${x.parcel.address || 'the parcel'} (for the recorded order)`, item: '5' });
        P(`The real property distributed includes the property commonly known as ${x.parcel.address || '[address]'}${x.parcel.apn ? `, APN ${x.parcel.apn}` : ''}, legally described as: ${ld}.`);
      }
      for (const x of sales(F).filter((y) => y.sold)) if (String(F.opt('final.propertyOnHand') || '').includes(String(x.parcel.address || '@@'))) ctx.warnings.push(`The property on hand lists ${x.parcel.address}, but the file shows it was sold. Check item 5.`);
      const hs = heirs(F, ID).filter((h) => !h.deceased);
      hs.forEach((h) => d.calc(`distributee.${h.index + 1}`, `Distributee ${h.index + 1} and share`, `${h.name}: ${h.share || ''}%`, `${h.nameSource}; case.heirs[${h.index}].sharePercentage`, '5'));
      p.table(hs.map((h) => [`${h.name}${h.address ? `, ${h.address}` : ''}`, h.share ? `${h.share}%` : '[share]']), { widths: [360, 101] });
      p.blank(1);
      if (F.opt('final.distributionConfirmed') !== true) { F.need('final.distributionConfirmed', ID, { label: 'Distributees and shares confirmed against the will or intestate succession?', type: 'yesno' }); P('[ANSWER NEEDED: confirm the distributees and shares above]'); }
      P(`6. ${d.t('final.conditionsOrAlternates', { label: 'Any limitation or condition on distribution (11603(b)(2)), alternate distributees for anyone whose whereabouts are unknown (11603(c)), and any 21135 or 6409 question (11640(b)); or "None"', item: '6' })}.`);
      P(`7. Upon filing receipts for the distributions ordered above, the ${capText} may apply for discharge (Probate Code section 12250).`);
      p.blank(2);
      p.signature({ dateLine: 'Dated:', lines: ['JUDGE OF THE SUPERIOR COURT'] });
    },
  });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Order Settling First and Final Report and for Final Distribution', revision: 'Office pleading (28-line, Pleading_Paper_Template_v2)', sourceUrl: '', procedures: ['full'], build };
