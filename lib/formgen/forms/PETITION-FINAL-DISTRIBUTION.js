// First and Final Report on Waiver of Account and Petition for Final Distribution, on the
// office's 28-line pleading paper. No Judicial Council form exists.
// Sources: Prob. Code 10954 (waiver of account; final report states compensation and its basis),
// 11640 (petition for final distribution), 11603 (contents of the order), 10800 and 10810
// (statutory compensation and its base), 9202 (DHCS, CalVCB, FTB, DCSS notices), 9100 (claim period),
// 8800(d) (change in ownership certification), 11601 and 1220 (notice of hearing).
// Only facts in the file are stated. Everything else prints as [ANSWER NEEDED] until Rozsa answers.
const { buildPleading } = require('../pleading');
const { docFields } = require('../docfields');
const { heirs } = require('../people');
const { capacity, prName } = require('../logic');
const { statutoryFee } = require('../fees');
const { longDate, money, num, addMonths } = require('../format');

const ID = 'PETITION-FINAL-DISTRIBUTION';
const CAP_TITLE = { executor: 'EXECUTOR', 'administrator with will annexed': 'ADMINISTRATOR WITH WILL ANNEXED', administrator: 'ADMINISTRATOR' };

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name', item: 'Caption' });
  const cap = capacity(F, ID);
  const capWord = cap ? cap.value : undefined;
  if (cap) d.calc('pr.capacity', 'Capacity of personal representative', cap.value, cap.source, 'Caption');
  const pr = prName(F, ID);
  if (pr) d.calc('pr.name', 'Personal representative', pr.value, pr.source, 'Caption');
  const prText = pr ? pr.value : '[ANSWER NEEDED: personal representative]';
  const capText = capWord || '[ANSWER NEEDED: capacity]';
  const capCaps = CAP_TITLE[capWord] || 'PERSONAL REPRESENTATIVE';
  const title = `First and Final Report of ${capCaps.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} on Waiver of Account and Petition for Final Distribution`;
  const county = F.opt('court.county') || '[ANSWER NEEDED: county]';
  const caseNo = F.opt('case.number');
  d.calc('case.number', 'Case number', caseNo, F.src('case.number'), 'Caption');
  const hd = F.opt('final.hearingDate');
  const hearing = { date: hd ? longDate(hd) : '', time: F.opt('final.hearingTime') || '', dept: F.opt('hearing.dept') || '' };

  const dod = d.t('decedent.dateOfDeath', { label: 'Date of death', date: true, item: '2' });
  const resCounty = F.opt('decedent.residenceCounty');
  const will = F.get('will.exists', ID);
  const lettersRaw = d.raw('letters.date', { label: 'Date Letters first issued', item: '3' });
  const letters = lettersRaw ? longDate(lettersRaw) : '[ANSWER NEEDED: date Letters issued]';
  const iaea = F.opt('petition.iaeaAuthority');

  // sales of real property in the file drive gains and losses (Rozsa's review fix D)
  const { sales } = require('../logic');
  const sold = sales(F).filter((x) => x.sold && x.gainLoss !== undefined);
  const saleGain = sold.reduce((t, x) => t + Math.max(0, x.gainLoss), 0);
  const saleLoss = sold.reduce((t, x) => t + Math.max(0, -x.gainLoss), 0);
  const derived = (key, label, value) => {
    const given = F.opt(key);
    if (given !== undefined && sold.length && Math.abs(num(given) - value) > 0.005) ctx.warnings.push(`${label}: the answer ($${money(given)}) does not match the sales in the file ($${money(value)}). Check it.`);
    if (given !== undefined) return d.raw(key, { label, type: 'money', item: '16' });
    if (sold.length) return d.calc(key, label, value, `computed from the sale answers (${sold.map((x) => x.key).join(', ')}): sale price minus appraised value`, '16');
    return d.raw(key, { label, type: 'money', item: '16' });
  };
  // the personal representative's own statutory commission is requested only if the client asks for it
  const prAsks = d.raw('final.prRequestsCompensation', { label: 'Does the personal representative ask the court for the statutory commission (Probate Code 10800)? (client choice, yes or no)', type: 'yesno', item: '17' });
  const fullTitle = prAsks === true ? `${title}; and for Allowance of Statutory Compensation of the Personal Representative` : title;
  // total of the inventories, from the file: Attachment 1 values confirmed by the personal
  // representative (asset.<id>.dodValue) plus the referee's Attachment 2 total as filed
  const items = require('../admin-helpers').inventoryItems(F);
  const att1 = items.filter((i) => i.att === 1).map((i) => F.opt(`asset.${i.id}.dodValue`));
  const att1Total = att1.every((v) => v !== undefined) ? att1.reduce((t, v) => t + num(v), 0) : undefined;
  const refTotal = d.raw('final.refereeAppraisalTotal', { label: 'Total appraisal by the probate referee (Attachment 2), as shown on the filed Inventory and Appraisal (DE-160 item 2)', type: 'money', item: '11' });
  const inv = att1Total !== undefined && refTotal !== undefined ? att1Total + num(refTotal) : undefined;
  if (inv !== undefined) d.calc('final.inventoryTotal', 'Total appraised value of all inventories', money(inv), `Attachment 1 (asset.*.dodValue: $${money(att1Total)}) + referee Attachment 2 (${F.src('final.refereeAppraisalTotal')}: $${money(refTotal)})`, '11');
  if (inv !== undefined && F.opt('final.inventoryTotal') !== undefined && Math.abs(num(F.opt('final.inventoryTotal')) - inv) > 0.005) ctx.warnings.push(`The typed inventory total ($${money(F.opt('final.inventoryTotal'))}) does not match the inventories in the file ($${money(inv)}); the file figure is used.`);
  const gains = prAsks === true ? derived('final.gainsOnSales', 'Gains over appraisal value on sales', saleGain) : undefined;
  const receipts = prAsks === true ? d.raw('final.receipts', { label: 'Receipts during administration (0 if none)', type: 'money', item: '16' }) : undefined;
  const losses = prAsks === true ? derived('final.lossesOnSales', 'Losses from appraisal value on sales', saleLoss) : undefined;
  const baseKnown = prAsks === true && [inv, gains, receipts, losses].every((x) => x !== undefined);
  const base = baseKnown ? num(inv) + num(gains) + num(receipts) - num(losses) : undefined;
  const fee = base !== undefined ? statutoryFee(base) : undefined;
  if (base !== undefined) {
    d.calc('final.feeBase', 'Estate accounted for (10810(b))', money(base), 'computed: inventory + gains + receipts - losses', '12');
    d.calc('final.statutoryFee', 'Personal representative statutory commission (10800)', money(fee.fee), 'computed under Prob. Code 10800 (same percentages as 10810(a))', '17');
  }

  const doc = await buildPleading({
    title: fullTitle, footer: `FIRST AND FINAL REPORT AND PETITION FOR FINAL DISTRIBUTION - Estate of ${String(name)}, CASE NO. ${caseNo || '________'}`,
    partyBlock: require('../filer').partyLines(F, ID),
    attorneyFor: `Petitioner, ${capText}, self-represented`,
    county, caseNumber: caseNo || '', hearing,
    captionLeft: ['In the Matter of the Estate of', '', `${String(name)},`, '', 'Deceased.'],
    build: async (p) => {
      const P = (t) => p.para(t);
      const H = (t) => { p.heading(t); };
      P(`${prText}, as ${capText} of the estate of ${name} (the "Decedent"), petitions the Court and reports as follows:`);
      H('I. ADMINISTRATION OF THE ESTATE');
      P(`1. Decedent died on ${dod}, a resident of ${resCounty ? `the County of ${resCounty}` : '[ANSWER NEEDED: county of residence]'}, State of California.`);
      if (will === true) {
        const wd = d.t('will.date', { label: 'Date of the will', date: true, item: '2' });
        const adm = d.t('final.willAdmittedDate', { label: 'Date the will was admitted to probate', date: true, item: '2' });
        P(`2. Decedent died testate. Decedent's will dated ${wd} was admitted to probate by order of this Court on ${adm}.`);
      } else if (will === false) P('2. Decedent died intestate.');
      else P('2. [ANSWER NEEDED: did the Decedent leave a will]');
      P(`3. ${prText} was appointed ${capText} and Letters were first issued on ${letters}${iaea && iaea !== 'none' ? ` with ${iaea} authority under the Independent Administration of Estates Act` : ''}. ${capText.replace(/^\w/, (c) => c.toUpperCase())} has served continuously since that date.`);
      P(`4. Notice of the petition to administer the estate was published under Probate Code section 8120, and proof of publication was filed on ${d.t('final.publicationProofDate', { label: 'Date proof of publication of the notice of petition was filed', date: true, item: '4' })}.`);
      H('II. CREDITORS AND CLAIMS');
      const claimEnd = lettersRaw ? longDate(addMonths(lettersRaw, 4)) : '[ANSWER NEEDED: date Letters issued]';
      P(`5. More than four months have passed since Letters were first issued (the claim period under Probate Code section 9100 ended on ${claimEnd}). Notice of administration was given to known or reasonably ascertainable creditors as follows: ${d.t('final.creditorNotice', { label: 'Creditors given notice (DE-157) and dates, or "none known"', item: '5' })}.`);
      P(`6. Creditor claims: ${d.t('final.claimsStatement', { label: 'Claims filed and how each was allowed, rejected or paid, or "No creditor claims were filed"', item: '6' })}.`);
      H('III. NOTICES TO PUBLIC AGENCIES (PROBATE CODE SECTION 9202)');
      P(`7. Department of Health Care Services: ${d.t('final.dhcsStatement', { label: 'DHCS 9202(a): notice given on (date) and response, or the fact showing it was not required', item: '7' })}.`);
      P(`8. Franchise Tax Board: notice of administration was given on ${d.t('final.ftbNoticeDate', { label: 'Date FTB notice given (9202(c))', date: true, item: '8' })}.`);
      P(`9. California Victim Compensation Board: ${d.t('final.calvcbStatement', { label: 'CalVCB 9202(b): notice given on (date), or the fact showing it was not required', item: '9' })}.`);
      if (lettersRaw && String(lettersRaw) >= '2026-01-01') P(`10. Department of Child Support Services: ${d.t('final.dcssStatement', { label: 'DCSS 9202(e) (Letters on or after 1/1/2026): notice given on (date), or the fact showing it was not required', item: '10' })}.`);
      H('IV. INVENTORY, PROPERTY AND TAXES');
      P(`11. Inventory and Appraisal: ${d.t('final.inventoryStatement', { label: 'Each Inventory and Appraisal filed (date and appraised value) and the 8800(d) change in ownership statement status', item: '11' })}. The total appraised value of all inventories is ${inv !== undefined ? `$${money(inv)}` : '[ANSWER NEEDED: inventory total]'}.`);
      const pa = Array.isArray(F.caseData.proposedActions) ? F.caseData.proposedActions : [];
      const iaeaText = F.opt('final.iaeaActions') !== undefined ? d.t('final.iaeaActions', { label: 'Actions taken with Notice of Proposed Action (DE-165) and their dates, or "none"', item: '12' })
        : pa.length ? d.calc('final.iaeaActions', 'Actions taken with Notice of Proposed Action', pa.map((a, i) => {
          // the notice date is when DE-165 was mailed (at least 15 days before the action, Prob. Code 10586)
          const nd = F.opt(`nopa.${i + 1}.noticeDate`) || a.noticeDate;
          if (!nd) F.need(`nopa.${i + 1}.noticeDate`, ID, { label: `Date the Notice of Proposed Action for "${a.title}" was mailed`, type: 'date' });
          else if (a.date && String(nd) > require('../format').addDays(String(a.date), -15)) ctx.warnings.push(`"${a.title}": notice mailed ${longDate(nd)} is less than 15 days before the action on ${longDate(a.date)} (Prob. Code 10586).`);
          return `${a.title}${a.date ? `, taken on or after ${longDate(a.date)}` : ''} (notice of proposed action mailed ${nd ? longDate(nd) : '[ANSWER NEEDED: date mailed]'})`;
        }).join('; '), 'case.proposedActions; nopa.N.noticeDate', '12')
          : d.t('final.iaeaActions', { label: 'Actions taken with Notice of Proposed Action (DE-165) and their dates, or "none"', item: '12' });
      if (pa.length && /^none/i.test(String(F.opt('final.iaeaActions') || ''))) ctx.warnings.push('The file has Notice of Proposed Action records, but the answer says none. Check paragraph 12.');
      const soldTxt = sales(F).filter((x) => x.sold).map((x) => `The real property at ${x.parcel.address || 'the parcel'} was sold for $${money(x.bid)}${F.opt(`${x.key}.noticeOfSale`) ? '' : ''}${F.opt(`${x.key}.hearingDate`) ? `, confirmed by the Court on ${longDate(F.opt(`${x.key}.hearingDate`))}` : ''}.`).join(' ');
      P(`12. Actions under the Independent Administration of Estates Act: ${iaeaText}.`);
      if (soldTxt) P(`12A. Sales of real property confirmed by the Court (Probate Code sections 10308 to 10313), not under the Independent Administration of Estates Act: ${soldTxt}`);
      P(`13. Taxes: ${d.t('final.taxStatement', { label: 'Status of the decedent final income tax returns, fiduciary returns and any estate tax return', item: '13' })}.`);
      P(`14. Character of property: ${d.t('final.characterStatement', { label: 'Separate, community or quasi-community character of the estate property', item: '14' })}.`);
      H('V. WAIVER OF ACCOUNT');
      { const ws = d.t('final.waiversStatement', { label: 'Are written waivers of account from every distributee signed and attached? (state yes, or list who has not)', item: '15' });
        const yes = /^yes\b/i.test(String(ws).trim());
        if (!yes && !/ANSWER NEEDED/.test(String(ws))) ctx.warnings.push('Paragraph 15: not every distributee has signed a waiver of account; a full account is needed (Prob. Code 10954).');
        P(yes ? `15. Each person entitled to distribution has executed a written waiver of account under Probate Code section 10954${/attached/i.test(String(ws)) ? `, and the waivers are attached${(String(ws).match(/as (Exhibit [A-Z0-9]+)/i) || [])[1] ? ` as ${String(ws).match(/as (Exhibit [A-Z0-9]+)/i)[1]}` : ''}` : ''}. This report is filed under section 10954(c)(1).` : `15. Waivers of account (Probate Code section 10954): ${ws}.`); }
      H('VI. COMPENSATION');
      P('16. Petitioner is self-represented. No attorney compensation is paid or payable from the estate (Probate Code section 10954(c)(1)).');
      if (prAsks === true) P(`17. The ${capText} requests statutory compensation under Probate Code section 10800 of ${fee ? `$${money(fee.fee)}` : '[ANSWER NEEDED: inventory, gains, receipts and losses]'}, computed on the estate accounted for of ${base !== undefined ? `$${money(base)}` : '[ ]'}: the appraised inventory of ${inv !== undefined ? `$${money(inv)}` : '[ ]'}, plus gains on sales of ${gains !== undefined ? `$${money(gains)}` : '[ ]'}, plus receipts of ${receipts !== undefined ? `$${money(receipts)}` : '[ ]'}, less losses on sales of ${losses !== undefined ? `$${money(losses)}` : '[ ]'}.`);
      else if (prAsks === false) P(`17. The ${capText} does not request statutory compensation.`);
      else P('17. [ANSWER NEEDED: does the personal representative ask for the statutory commission]');
      if (fee && fee.overCap) ctx.warnings.push('The estate exceeds $25,000,000: compensation above that amount is set by the court (Prob. Code 10810(a)(6)).');
      H('VII. PROPOSED DISTRIBUTION');
      { const poh = d.t('final.propertyOnHand', { label: 'Property on hand for distribution (each item with value), after payment of expenses', item: '18' });
        const cc = require('../logic').cashCheck(F);
        if (cc.checked && !cc.ok) {
          ctx.warnings.push(`Paragraph 18 blocked: cash on hand of $${cc.cash} is more than the file supports (at most $${cc.boundText} before expenses: ${cc.parts}). Correct the answer or the file.`);
          P(`18. Property on hand for distribution: [ANSWER NEEDED: the cash on hand ($${cc.cash}) does not agree with the file (at most $${cc.boundText} before expenses)].`);
        } else {
          if (cc.checked) d.calc('final.propertyOnHandCheck', 'Cash on hand checked against the file', `at most $${cc.boundText} before expenses`, cc.parts, '18');
          P(`18. Property on hand for distribution: ${poh}.`);
        } }
      for (const x of sales(F).filter((y) => y.sold)) if (String(F.opt('final.propertyOnHand') || '').includes(String(x.parcel.address || '@@'))) ctx.warnings.push(`Property on hand lists ${x.parcel.address}, but the file shows it was sold. Check paragraph 18.`);
      P(`19. Reserve for closing expenses: ${d.t('final.reserve', { label: 'Amount to be held back for closing expenses and taxes (or 0)', type: 'money', money: true, item: '19' })}.`);
      const hs = heirs(F, ID).filter((h) => !h.deceased);
      const confirm = d.raw('final.distributionConfirmed', { label: `Distribution ${will ? 'under the will' : 'by intestate succession'} to the persons and shares in the heirs list of the file: confirmed? (yes/no)`, type: 'yesno', item: '20' });
      P(`20. The persons entitled to distribution ${will ? 'under the will' : 'under the laws of intestate succession'} and their shares are:`);
      const rows = hs.map((h) => [`${h.name}, ${h.relationship}${h.address ? `, ${h.address}` : ''}`, h.share ? `${h.share}%` : '[share]']);
      hs.forEach((h) => d.calc(`distributee.${h.index + 1}`, `Distributee ${h.index + 1} and share`, `${h.name}: ${h.share || ''}%`, `${h.nameSource}; case.heirs[${h.index}].sharePercentage`, '20'));
      p.table(rows, { widths: [360, 101] });
      p.blank(1);
      if (confirm !== true) P('[ANSWER NEEDED: confirm the distributees and shares above against the will or intestate succession]');
      H('PRAYER');
      P('Petitioner prays for an order that:');
      P(`1. The First and Final Report of the ${capText} be settled, allowed and approved, and all acts and proceedings of the ${capText} be confirmed and approved;`);
      let n = 2;
      if (prAsks === true) P(`${n++}. The ${capText} be allowed statutory compensation of ${fee ? `$${money(fee.fee)}` : '[ ]'};`);
      P(`${n++}. The reserve stated above be allowed, and the estate be distributed to the persons and in the shares set forth in paragraph 20; and`);
      P(`${n}. The Court make such other orders as it considers proper.`);
      p.signature({ dateLine: 'Dated:', lines: [String(prText), `Petitioner, ${capText}, self-represented`] });
      H('VERIFICATION');
      P(`I, ${prText}, am the ${capText} of the estate of ${name}. I have read the foregoing report and petition, and the facts stated in it are true of my own knowledge, except as to matters stated on information and belief, and as to those matters I believe them to be true. I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.`);
      p.signature({ dateLine: 'Executed on ______________, at ______________, California.', lines: [String(prText)] });
    },
  });
  ctx.warnings.push('Attach each distributee\'s signed waiver of account, and give notice of hearing on DE-120 at least 15 days before the hearing (Prob. Code 11601, 1220).');
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'First and Final Report on Waiver of Account and Petition for Final Distribution', revision: 'Office pleading (28-line, Pleading_Paper_Template_v2)', sourceUrl: '', procedures: ['full'], build };
