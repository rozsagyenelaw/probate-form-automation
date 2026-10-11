// Shared pieces for the post-letters agency notices (Prob. Code 9202) and the will-lodging
// letters (Prob. Code 8200). Agency addresses are recorded with where they were verified.
const { docFields } = require('./docfields');
const { courtFor } = require('./courts');
const { capacity, prName } = require('./logic');
const { longDate, fmtDate, isoDate } = require('./format');

const AGENCIES = {
  FTB: {
    lines: ['Decedent and Probate Program MS A454', 'Franchise Tax Board', 'PO Box 2952', 'Sacramento, CA 95812-2952'],
    verified: 'FTB 1240 contact directory, https://www.ftb.ca.gov/forms/misc/1240.html (Revised 03/2025; opened 2026-10-11): "Decedent and Probate Program ... Mail Decedent and Probate Program MS A454 Franchise Tax Board PO Box 2952 Sacramento CA 95812-2952"', unverified: false,
  },
  DHCS: {
    lines: ['Department of Health Care Services', 'Estate Recovery Program, MS 4720', 'P.O. Box 997425', 'Sacramento, CA 95899-7425'],
    verified: 'https://www.dhcs.ca.gov/services/estate-recovery-program/ (opened in Chrome 2026-10-11 10:10 PDT): "You may also mail Notice of Death with a copy of the death certificate to DHCS at: Department of Health Care Services, Estate Recovery Program, MS 4720, P.O. Box 997425, Sacramento, CA 95899-7425." Notice is due within 90 days of the date of death with a copy of the death certificate; DHCS also takes its online Notice of Death form (https://www.dhcs.ca.gov/services/estate-recovery-online-forms/, Prob. Code 215, 9202)', unverified: false,
  },
  CALVCB: {
    lines: ['California Victim Compensation Board', 'P.O. Box 3036', 'Sacramento, CA 95812-3036'],
    verified: 'https://victims.ca.gov/restitution/ (opened 2026-10-10 18:58 UTC: "Court Ordered Debt Probate Requests - CODProbateRequest@victims.ca.gov" and mailing address P.O. Box 3036). The older CalVCB-RRB-01 form still on victims.ca.gov names Revenue Recovery Branch, P.O. Box 1348, Sacramento 95812-1348; the current web page is used', unverified: true,
  },
  DCSS: {
    lines: ['Director, California Department of Child Support Services', 'P.O. Box 419064', 'Rancho Cordova, CA 95741-9064'],
    verified: 'https://childsupport.ca.gov/contact-us/ (opened 2026-10-10 18:59 UTC: "Contact Address (No Payments Accepted) Department of Child Support Services, P.O. Box 419064, Rancho Cordova, CA 95741-9064"); DCSS publishes no separate probate address', unverified: false,
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
  // dated from the file (the notice date recorded for the final petition), never silently after
  // the 90-day deadline (Prob. Code 9202)
  const mailedKeys = { 'NOTICE-9202-DHCS': ['final.dhcsNoticeDate'], 'NOTICE-9202-FTB': ['final.ftbNoticeDate'], 'NOTICE-9202-CALVCB': ['final.calvcbNoticeDate'], 'NOTICE-9202-DCSS': ['final.dcssNoticeDate'] }[ID] || [];
  const lIso = letters ? isoDate(letters) : '';
  const date = require('./letterdate').letterDate(F, d, ctx, { form: ID, mailedKeys, deadline: lIso ? require('./format').addDays(lIso, 90) : undefined, deadlineText: 'the 90-day deadline after Letters (Prob. Code 9202)' });
  // the personal representative sends the notice in their own name (self-represented)
  const fl = require('./filer').filer(F, ID);
  const sender = { lines: [fl.name, fl.street, fl.cityStateZip, fl.phone, fl.email].filter(Boolean).map((x) => x.value), signName: prText, signTitle: capText.replace(/^\w/, (ch) => ch.toUpperCase()) };
  if (fl.street) d.calc('petitioner.address', 'Sender address', fl.oneLine.value, fl.oneLine.source, 'Sender');
  else F.need('petitioner.address', ID);
  return { sender, d, name, capText, prText, courtText, caseNo, dod, letters, lettersText: letters ? longDate(letters) : '[ANSWER NEEDED: date Letters issued]', date };
}

function agencyBlock(ctx, key) {
  const a = AGENCIES[key];
  if (a.unverified) ctx.warnings.push(`Confirm the ${key} mailing address before mailing: ${a.lines.join(', ')} (source: ${a.verified}).`);
  return a.lines;
}

module.exports = { AGENCIES, common, agencyBlock };
