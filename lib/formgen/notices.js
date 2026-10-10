// Shared pieces for the post-letters agency notices (Prob. Code 9202) and the will-lodging
// letters (Prob. Code 8200). Agency addresses are recorded with where they were verified.
const { docFields } = require('./docfields');
const { courtFor } = require('./courts');
const { capacity, prName } = require('./logic');
const { longDate, fmtDate, isoDate } = require('./format');

const AGENCIES = {
  FTB: {
    lines: ['Franchise Tax Board', 'PO Box 2952, MS 454', 'Sacramento, CA 95812-9974'],
    verified: 'https://www.ftb.ca.gov/file/personal/filing-status/deceased-person.html (opened 2026-10-10, "Probate" section)', unverified: false,
  },
  DHCS: {
    lines: ['Department of Health Care Services', 'Third Party Liability and Recovery Division', 'Recovery Branch, MS 4720', 'P.O. Box 997425', 'Sacramento, CA 95899-7425'],
    verified: 'DHCS 6251 (Rev. 11/2021) as quoted in search results; dhcs.ca.gov refused automated access (HTTP 403) on 2026-10-10', unverified: true,
  },
  CALVCB: {
    lines: ['California Victim Compensation Board', 'P.O. Box 3036', 'Sacramento, CA 95812-3036'],
    verified: 'https://victims.ca.gov/restitution/ (opened 2026-10-10: general mailing address and CODProbateRequest@victims.ca.gov); no page names a 9202(b) address', unverified: true,
  },
  DCSS: {
    lines: ['Director, California Department of Child Support Services', 'P.O. Box 419064', 'Rancho Cordova, CA 95741-9064'],
    verified: 'https://childsupport.ca.gov/contact-us/ (opened 2026-10-10: "Contact Address (No Payments Accepted)"); not a probate-specific address', unverified: true,
  },
};

function common(F, ID, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name', item: 'RE' });
  const cap = capacity(F, ID);
  const capText = cap ? cap.value : '[ANSWER NEEDED: capacity of the personal representative]';
  if (cap) d.calc('pr.capacity', 'Capacity of the personal representative', cap.value, cap.source, 'Body');
  const pr = prName(F, ID);
  const prText = pr ? pr.value : '[ANSWER NEEDED: personal representative]';
  if (pr) d.calc('pr.name', 'Personal representative', pr.value, pr.source, 'Body');
  const c = courtFor(F, ID);
  const courtText = c.county ? `Superior Court of California, County of ${c.county}` : '[ANSWER NEEDED: court]';
  const caseNo = d.t('case.number', { label: 'Case number', item: 'RE' });
  const dod = d.t('decedent.dateOfDeath', { label: 'Date of death', date: true, item: 'RE' });
  const letters = d.raw('letters.date', { label: 'Date Letters first issued', type: 'date', item: 'Body', show: fmtDate });
  const today = isoDate(ctx.now || new Date());
  const date = F.opt('letter.date') ? longDate(F.opt('letter.date')) : longDate(today);
  d.calc('letter.date', 'Letter date', date, F.opt('letter.date') ? F.src('letter.date') : 'date the letter was generated (change if mailed later)', 'Date');
  return { d, name, capText, prText, courtText, caseNo, dod, letters, lettersText: letters ? longDate(letters) : '[ANSWER NEEDED: date Letters issued]', date };
}

function agencyBlock(ctx, key) {
  const a = AGENCIES[key];
  if (a.unverified) ctx.warnings.push(`Confirm the ${key} mailing address before mailing: ${a.lines.join(', ')} (source: ${a.verified}).`);
  return a.lines;
}

module.exports = { AGENCIES, common, agencyBlock };
