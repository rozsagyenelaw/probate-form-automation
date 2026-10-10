// Notice of death to the Director of Health Care Services, Prob. Code 9202(a) and 215: required
// when the personal representative knows or has reason to believe the decedent (or a predeceased
// spouse) received Medi-Cal. Within 90 days after Letters; given under 1215 to the Sacramento
// office with a copy of the death certificate (215). DHCS also accepts its online notice-of-death
// form (9202(a)); the address used here could not be opened today (see warnings).
const { buildLetter } = require('../letter');
const { common, agencyBlock } = require('../notices');
const { addDays, fmtDate } = require('../format');

const ID = 'NOTICE-9202-DHCS';

async function build(F, ctx) {
  const c = common(F, ID, ctx);
  const medi = c.d.raw('decedent.mediCal', { label: 'Did the decedent, or a predeceased spouse of the decedent, receive Medi-Cal (health care under Welf. & Inst. Code 14000 or 14200)? (Prob. Code 9202(a))', type: 'yesno', item: 'Applies' });
  if (medi === false) ctx.warnings.push('No Medi-Cal in the file: Prob. Code 9202(a) does not require this notice. Do not send unless you decide otherwise.');
  const dob = c.d.t('decedent.dateOfBirth', { label: 'Decedent date of birth', date: true, item: 'RE' });
  const ssn4 = c.d.raw('decedent.ssnLast4', { label: 'Last 4 digits of SSN', item: 'RE' });
  const doc = await buildLetter({
    sender: c.sender,
    date: c.date,
    recipient: agencyBlock(ctx, 'DHCS'),
    re: [`Estate of ${c.name}, Deceased`, `Date of birth: ${dob}    Date of death: ${c.dod}`, `Social Security No.: XXX-XX-${ssn4 || '[ANSWER NEEDED]'}`, `${c.courtText}, Case No. ${c.caseNo}`, 'Notice of Death (Probate Code sections 215 and 9202(a))'],
    body: [
      `I am ${c.prText}, the ${c.capText} of the Estate of ${c.name}. Letters were first issued on ${c.lettersText}.`,
      'Under Probate Code sections 215 and 9202(a), I give the Director of Health Care Services notice of the decedent\'s death. A copy of the death certificate and a copy of the Letters are enclosed.',
      `Please direct any claim or correspondence about this estate to me at the address above.`,
    ],
    enclosures: ['Certified copy of death certificate', 'Letters'],
  });
  if (c.letters) ctx.warnings.push(`Due no later than ${fmtDate(addDays(c.letters, 90))} (90 days after Letters, Prob. Code 9202(a)).`);
  return { doc, fields: c.d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Notice of Death to the Department of Health Care Services (Prob. Code 9202(a), 215)', revision: 'Office letter', sourceUrl: '', procedures: ['full'], build };
