// Notice of administration to the Franchise Tax Board, Prob. Code 9202(c): within 90 days after
// Letters are first issued, given as provided in Prob. Code 1215. FTB asks for the Letters
// (ftb.ca.gov, "Deceased person", Probate section, opened 2026-10-10). No FTB form exists.
const { buildLetter } = require('../letter');
const { common, agencyBlock } = require('../notices');
const { addDays, fmtDate } = require('../format');

const ID = 'NOTICE-9202-FTB';

async function build(F, ctx) {
  const c = common(F, ID, ctx);
  const doc = await buildLetter({
    sender: c.sender,
    date: c.date,
    recipient: agencyBlock(ctx, 'FTB'),
    re: [`Estate of ${c.name}, Deceased`, `${c.courtText}, Case No. ${c.caseNo}`, `Date of death: ${c.dod}`, 'Notice of Administration of Estate (Probate Code section 9202(c))'],
    body: [
      `I am ${c.prText}, the ${c.capText} of the Estate of ${c.name}. Letters were first issued on ${c.lettersText}.`,
      'Under Probate Code section 9202(c), I give the Franchise Tax Board notice of the administration of this estate. A copy of the Letters is enclosed.',
      `Please direct any correspondence about this estate to me at the address above.`,
    ],
    enclosures: ['Letters'],
  });
  if (c.letters) ctx.warnings.push(`Due no later than ${fmtDate(addDays(c.letters, 90))} (90 days after Letters, Prob. Code 9202(c)).`);
  return { doc, fields: c.d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Notice of Administration to the Franchise Tax Board (Prob. Code 9202(c))', revision: 'Office letter', sourceUrl: '', procedures: ['full'], build };
