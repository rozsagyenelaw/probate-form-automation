// Notice of death to the Director of the California Victim Compensation Board, Prob. Code 9202(b)
// and 216: only when the personal representative or attorney knows an heir or beneficiary is or
// was confined in a CDCR facility or a local jail or correctional facility. Within 90 days after
// Letters; under 1215; contents per 216(c).
const { buildLetter } = require('../letter');
const { common, agencyBlock } = require('../notices');
const { addDays, fmtDate } = require('../format');

const ID = 'NOTICE-9202-CALVCB';

async function build(F, ctx) {
  const c = common(F, ID, ctx);
  const applies = c.d.raw('calvcb.heirConfined', { label: 'Do you know that an heir or beneficiary is or has been confined in a CDCR prison or facility or a county or city jail or other local correctional facility? (Prob. Code 9202(b))', type: 'yesno', item: 'Applies' });
  if (applies === false) ctx.warnings.push('No confined heir or beneficiary known: Prob. Code 9202(b) does not require this notice.');
  const ask = (key, opts) => (applies === false ? '[not applicable]' : c.d.t(key, opts));
  const heir = ask('calvcb.heirName', { label: 'Name of the heir or beneficiary who is or was confined', item: '216(c)(1)' });
  const hdob = ask('calvcb.heirDob', { label: 'Date of birth of that heir or beneficiary', mdy: true, item: '216(c)(1)' });
  const loc = ask('calvcb.heirLocation', { label: 'Location of incarceration, or current address if no longer incarcerated', item: '216(c)(1)' });
  const num = ask('calvcb.heirIdNumber', { label: 'CDCR number (state facility) or booking number (county facility)', item: '216(c)(2)' });
  const doc = await buildLetter({
    date: c.date,
    recipient: agencyBlock(ctx, 'CALVCB'),
    re: [`Estate of ${c.name}, Deceased`, `${c.courtText}, Case No. ${c.caseNo}`, `Date of death: ${c.dod}`, 'Notice of Death (Probate Code sections 216 and 9202(b))'],
    body: [
      `This office represents ${c.prText}, the ${c.capText} of the Estate of ${c.name}, in the ${c.courtText}, Case No. ${c.caseNo}. Letters were first issued on ${c.lettersText}.`,
      'Under Probate Code sections 216 and 9202(b), we give the Director of the California Victim Compensation Board notice of the decedent\'s death. The following heir or beneficiary is or has been confined:',
      `Name: ${heir}. Date of birth: ${hdob}. Location of incarceration or current address: ${loc}. CDCR or booking number: ${num}.`,
      `A copy of the decedent's death certificate is enclosed. Please direct any correspondence about this estate to the ${c.capText} in care of this office at the address above.`,
    ],
    enclosures: ['Copy of death certificate', 'Letters'],
  });
  if (c.letters) ctx.warnings.push(`Due no later than ${fmtDate(addDays(c.letters, 90))} (90 days after Letters, Prob. Code 9202(b)). CalVCB also lists CODProbateRequest@victims.ca.gov for probate requests.`);
  return { doc, fields: c.d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Notice of Death to the California Victim Compensation Board (Prob. Code 9202(b), 216)', revision: 'Office letter', sourceUrl: '', procedures: ['full'], build };
