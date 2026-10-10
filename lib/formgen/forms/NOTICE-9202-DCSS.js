// Notice of death to the Director of the California Department of Child Support Services,
// Prob. Code 9202(e) (added by Stats. 2025, ch. 200 (AB 1521), effective January 1, 2026):
// for estates whose Letters are first issued on or after January 1, 2026, when the personal
// representative or attorney knows or has reason to believe the decedent had a court-ordered
// child support obligation. Within 90 days after Letters, under 1215 (or the DCSS website).
const { buildLetter } = require('../letter');
const { common, agencyBlock } = require('../notices');
const { addDays, fmtDate, isoDate } = require('../format');

const ID = 'NOTICE-9202-DCSS';

async function build(F, ctx) {
  const c = common(F, ID, ctx);
  const cs = c.d.raw('decedent.childSupportOrder', { label: 'Do you know or have reason to believe the decedent had a child support obligation under a court order? (Prob. Code 9202(e))', type: 'yesno', item: 'Applies' });
  if (cs === false) ctx.warnings.push('No court-ordered child support obligation known: Prob. Code 9202(e) does not require this notice.');
  if (c.letters && isoDate(c.letters) < '2026-01-01') ctx.warnings.push('Letters were first issued before January 1, 2026: Prob. Code 9202(e)(3) does not apply to this estate.');
  const doc = await buildLetter({
    date: c.date,
    recipient: agencyBlock(ctx, 'DCSS'),
    re: [`Estate of ${c.name}, Deceased`, `${c.courtText}, Case No. ${c.caseNo}`, `Date of death: ${c.dod}`, 'Notice of Death (Probate Code section 9202(e))'],
    body: [
      `This office represents ${c.prText}, the ${c.capText} of the Estate of ${c.name}. Letters were first issued on ${c.lettersText}.`,
      'Under Probate Code section 9202(e), we give the Director of the Department of Child Support Services notice of the decedent\'s death. A copy of the Letters is enclosed.',
      `Please direct any claim or correspondence about this estate to the ${c.capText} in care of this office at the address above.`,
    ],
    enclosures: ['Letters'],
  });
  if (c.letters) ctx.warnings.push(`Due no later than ${fmtDate(addDays(c.letters, 90))} (90 days after Letters, Prob. Code 9202(e)).`);
  return { doc, fields: c.d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Notice of Death to the Department of Child Support Services (Prob. Code 9202(e))', revision: 'Office letter', sourceUrl: '', procedures: ['full'], build };
