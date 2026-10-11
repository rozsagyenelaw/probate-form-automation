// Client steps for the out-of-app tasks (Rozsa's decision 22): filing the papers, mailing the court
// notices, and newspaper publication. One source of truth for the wording:
//   - the generator renders these as PDF guides (FILING-STEPS, MAILING-STEPS, PUBLICATION-STEPS);
//   - the portal Cloud Functions write them to cases/{caseId}/clientSteps (W3-home's shape), from
//     a synced copy of this file (portal functions/formsSteps/clientStepsContent.js; keep in sync
//     with scripts/sync-client-steps.sh).
// No dependencies, so the same file runs in Node (Netlify) and in Cloud Functions.
// Plain words, no consultation wording, no location of the office. Every legal statement carries a
// source opened 2026-10-10 (build-evidence/W3-forms/sources/scope and notice-pub).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const S = (v) => (v === undefined || v === null ? '' : String(v)).trim();
function ymd(v) {
  if (!v) return '';
  if (typeof v === 'object' && typeof v.toDate === 'function') v = v.toDate();
  if (typeof v === 'object' && typeof v.seconds === 'number') v = new Date(v.seconds * 1000);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v)); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const u = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v)); if (u) return `${u[3]}-${u[1].padStart(2, '0')}-${u[2].padStart(2, '0')}`;
  return '';
}
function longDate(v) { const d = ymd(v); if (!d) return ''; const [y, m, dd] = d.split('-'); return `${MONTHS[Number(m) - 1]} ${Number(dd)}, ${y}`; }
function minusDays(v, n) { const d = ymd(v); if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd - n)).toISOString().slice(0, 10); }
function ans(answers, key) { const a = answers && answers[key]; return a && typeof a === 'object' && 'value' in a ? a.value : a; }
function fullName(p) { return p ? [p.firstName, p.middleName, p.lastName].map(S).filter(Boolean).join(' ') : ''; }
function oneLine(a) { if (!a) return ''; if (typeof a === 'string') return a; return [S(a.street), [S(a.city), [S(a.state), S(a.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', '); }

function procedureOf(c) {
  const st = S(c.serviceType).toLowerCase();
  if (/simplif|13151|residence|succession/.test(st)) return '13151';
  if (/spous|13650|partner/.test(st)) return '13650';
  if (/small/.test(st)) return 'small';
  return 'full';
}
function hearingDate(c, answers, type) {
  const hs = Array.isArray(c.hearings) ? c.hearings.filter((h) => h && h.type === type && h.date).sort((a, b) => S(b.date).localeCompare(S(a.date))) : [];
  if (hs.length) return ymd(hs[0].date);
  if (type === 'petition') return ymd(ans(answers, 'hearing.date') || (c.keyDates && c.keyDates.firstHearing) || (c.hearing && c.hearing.date));
  if (type === 'final') return ymd(ans(answers, 'final.hearingDate') || (c.keyDates && c.keyDates.finalHearing));
  return '';
}
function county(c) { return S((c.court && c.court.county) || c.filingCounty || (c.decedent && c.decedent.lastAddress && c.decedent.lastAddress.county)).replace(/\s+county$/i, ''); }

const SRC = {
  crc2253: { cite: 'Cal. Rules of Court, rule 2.253(b)(2)', url: 'https://courts.ca.gov/cms/rules/index/two/rule2_253' },
  ccp1010: { cite: 'Code Civ. Proc. 1010.6(g)(4)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1010.6' },
  lr47: { cite: 'LASC Local Rule 4.7(b), (c) (edition effective July 1, 2026)', url: 'https://www.lacourt.ca.gov/pages/lp/efiling/tp/probate-efiling' },
  lr45: { cite: 'LASC Local Rule 4.5 (form PRO 010)', url: 'https://www.lacourt.ca.gov/pages/lp/fo-forms/cp/probate' },
  laFiling: { cite: 'LASC, Filing My Probate Documents', url: 'https://www.lacourt.ca.gov/pages/lp/probate/cp/filing-my-probate-documents' },
  efsp: { cite: 'LASC approved e-filing service providers', url: 'https://www.lacourt.ca.gov/apps/efiling-providers/ejs' },
  fee: { cite: 'Statewide Civil Fee Schedule eff. Jan. 1, 2026 (Gov. Code 70650): $435', url: 'https://courts.ca.gov/system/files/file/statewide-civil-fee-schedule-eff-01012026.pdf' },
  fw001: { cite: 'Form FW-001, Request to Waive Court Fees (Rev. March 1, 2026)', url: 'https://courts.ca.gov/documents/fw001.pdf' },
  p8110: { cite: 'Prob. Code 8110', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=8110' },
  p1220: { cite: 'Prob. Code 1220(a)(1)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=1220' },
  p1215: { cite: 'Prob. Code 1215', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=1215' },
  p1260: { cite: 'Prob. Code 1260, 1261', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=1261' },
  ccp1013a: { cite: 'Code Civ. Proc. 1013a(1)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1013a' },
  crc751: { cite: 'Cal. Rules of Court, rule 7.51', url: 'https://courts.ca.gov/cms/rules/index/seven/rule7_51' },
  selfhelp: { cite: 'Judicial Council self-help guide, formal probate', url: 'https://selfhelp.courts.ca.gov/probate/formal-probate' },
  p8121: { cite: 'Prob. Code 8120, 8121', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=8121' },
  p8124: { cite: 'Prob. Code 8124', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=8124' },
  de121: { cite: 'Form DE-121 (Rev. January 1, 2013), note on page 1', url: 'https://courts.ca.gov/documents/de121.pdf' },
};

// Returns the steps for every phase up to `phase` (cockpit phases: 2 petition, 3 publication and
// notice, 10 final petition and distribution). Each: { key, phase, order, title, why, steps[],
// sources[], formIds[] (documents to attach when sent) }.
function buildSteps({ caseData = {}, answers = {}, phase = 11 }) {
  const c = caseData;
  const proc = procedureOf(c);
  const name = fullName(c.decedent) || 'the decedent';
  const la = /^los angeles$/i.test(county(c));
  const north = S(c.court && c.court.courthouse).toLowerCase().includes('antelope');
  const where = la ? (north ? 'Michael Antonovich Antelope Valley Courthouse, 42011 4th St. West, Lancaster, CA 93534, 1st floor, 8:30 a.m. to 4:30 p.m.'
    : 'Stanley Mosk Courthouse, 111 N. Hill St., Los Angeles, CA 90012, 4th floor, Room 429, 8:30 a.m. to 4:30 p.m.') : 'the probate clerk of your county superior court';
  const out = [];
  if (proc === 'small') {
    const hasReal = ((c.assets && c.assets.realProperty) || []).length > 0;
    if (hasReal) {
      out.push({
        key: 'file-papers', phase: 2, order: 1, title: 'Sign and file your affidavit for the real property',
        why: 'The affidavit for real property of small value is signed in front of a notary and then filed with the court in the county where the decedent lived. At least six months must have passed since the death.',
        steps: [
          'Read every page we prepared. If anything is wrong or missing, send us a message in your portal before you sign.',
          'Sign the affidavit (form DE-305) in front of a notary. Every person signing it signs in front of the notary.',
          'Attach a certified copy of the death certificate, the inventory and appraisal of the property, and form DE-300 (they are listed on the form).',
          `File it ${la ? `in person or by mail at ${where}, or online through any e-filing company on the court's approved list` : 'with the probate clerk of your county superior court'}, and pay the filing fee the clerk tells you.`,
          'Ask the clerk for a certified copy of the filed affidavit. Record that copy with the County Recorder where the property is located.',
          'Upload the file-stamped copy to your portal. Then tap "I did this".',
        ],
        sources: [{ cite: 'Prob. Code 13200, 13202', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13200' }, ...(la ? [SRC.laFiling, SRC.efsp] : []), SRC.crc2253],
        formIds: ['DE-305', 'PRO-010'],
      });
    } else {
      out.push({
        key: 'use-affidavit', phase: 2, order: 1, title: 'Collect the property with your affidavit',
        why: 'A small estate affidavit is not filed with the court. You give it to each bank or company holding the property. At least 40 days must have passed since the death.',
        steps: [
          'Read every page we prepared. If anything is wrong or missing, send us a message in your portal before you sign.',
          'Sign the affidavit for each holder. Many holders ask for a notary; take ID either way.',
          'Give each holder the signed affidavit with a certified copy of the death certificate and form DE-300. Keep a copy of everything.',
          'Tap "I did this" when every holder has the affidavit.',
        ],
        sources: [{ cite: 'Prob. Code 13100, 13101, 13104', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13101' }],
        formIds: ['SMALL-ESTATE-AFFIDAVIT'],
      });
    }
    return out;
  }
  const willExists = c.willExists === true || ans(answers, 'will.exists') === true;

  // 1. filing (phase 2)
  if (phase >= 2) {
    const papers = { full: 'your Petition for Probate (form DE-111)', '13151': 'your Petition to Determine Succession to Primary Residence (form DE-310) with its attachments', '13650': 'your Spousal or Domestic Partner Property Petition (form DE-221)' }[proc];
    out.push({
      key: 'file-petition', phase: 2, order: 1, title: 'File your court papers',
      why: 'You are the petitioner, so you file the papers yourself, in your own name. You can file online or in person, whichever is easier for you.',
      steps: [
        `Read every page we prepared. If anything is wrong or missing, send us a message in your portal before you sign.`,
        `Sign and date ${papers} where your name is printed${la ? ', and the Los Angeles cover sheet (form PRO 010)' : ''}.`,
        la ? 'To file online, choose any e-filing company from the court\'s approved list. E-filing is optional for you because you represent yourself. If you e-file, you agree to receive court papers by email.' : 'Check your court\'s website for online filing. People who represent themselves do not have to e-file.',
        `To file in person or by mail, go to ${where}.`,
        proc === 'full' ? 'Pay the filing fee of $435. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your petition.' : 'Pay the filing fee the clerk tells you. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your papers.',
        ...(proc === 'full' && willExists ? ['The original will cannot be filed online. If it has not already been deposited with the court, deliver the original to the clerk on paper.'] : []),
        'Upload the file-stamped copy to your portal. Then tap "I did this".',
      ],
      sources: [SRC.crc2253, SRC.ccp1010, ...(la ? [SRC.lr47, SRC.lr45, SRC.laFiling, SRC.efsp] : []), ...(proc === 'full' ? [SRC.fee] : []), SRC.fw001],
      formIds: proc === 'full' ? ['DE-111', 'PRO-010'] : proc === '13151' ? ['DE-310', 'PRO-010'] : ['DE-221', 'PRO-010'],
    });
  }
  // 2. mailing the notice (phase 3)
  const heirsList = (Array.isArray(c.heirs) ? c.heirs : []).filter((h) => !h.isDeceased && fullName(h).toLowerCase() !== fullName(c.petitioner).toLowerCase());
  const mailStep = (key, phaseN, order, label, formId, hd) => ({
    key, phase: phaseN, order, title: `Have the notice mailed: ${label}`,
    why: 'Before the hearing, the court notice must be mailed to everyone listed on it. The law does not let you mail it yourself: another adult who is not part of the case mails it and signs the proof of mailing.',
    steps: [
      'Ask an adult friend or relative (18 or older) who is not part of the case and inherits nothing from the estate, and who lives or works in the county where they mail it.',
      'Print the notice. Put one copy in a separate envelope for each person listed on page 2, even people at the same address.',
      `Mail each envelope by first-class mail with postage paid${hd ? `, no later than ${longDate(minusDays(hd, 15))} (at least 15 days before the hearing on ${longDate(hd)})` : ', at least 15 days before the hearing'}.`,
      `The people to mail to are: ${heirsList.length ? heirsList.map((h) => `${fullName(h)}${h.address ? ` (${oneLine(h.address)})` : ''}`).join('; ') : 'the people listed on page 2 of the notice'}.`,
      'On page 2, the person who mailed it fills in their own address, the date and city where they mailed it, prints their name and signs.',
      'Upload the signed notice with its proof page to your portal, then file it with the court before the hearing, the same way you filed your papers. Then tap "I did this".',
    ],
    sources: [SRC.p8110, SRC.p1220, SRC.p1215, SRC.p1260, SRC.ccp1013a, SRC.crc751, SRC.selfhelp],
    formIds: [formId],
  });
  if (phase >= 3) {
    const hd = hearingDate(c, answers, 'petition');
    out.push(mailStep('mail-notices', 3, 2, proc === 'full' ? 'notice of your petition' : 'notice of the hearing', proc === 'full' ? 'DE-121' : 'DE-120', hd));
    if (proc === 'full') {
      const paper = S(ans(answers, 'petition.newspaper'));
      const city = S(c.decedent && c.decedent.lastAddress && c.decedent.lastAddress.city);
      out.push({
        key: 'publication', phase: 3, order: 3, title: 'Publish the notice in the newspaper',
        why: 'The notice of your petition must be printed in a newspaper three times before the hearing. You place it yourself with one call or email to the newspaper.',
        steps: [
          paper ? `Use ${paper}.` : `Use a newspaper of general circulation in the city where ${name} lived${city ? ` (${city})` : ''}. We tell you which one when your papers are ready.`,
          'Send the newspaper\'s legal notices department page 1 of your Notice of Petition to Administer Estate (form DE-121), once the court has given you the case number and hearing date. Ask them to print it starting with the words "NOTICE OF PETITION TO ADMINISTER ESTATE", including the case number, and to leave out the parts the form says not to print.',
          `Ask them to publish it three times, the first time no later than ${hd ? longDate(minusDays(hd, 15)) : '15 days before the hearing'}, with at least five days between the first and the last time. Pay them directly.`,
          'Ask for the "proof of publication" (an affidavit they sign) and whether they file it with the court for you or send it to you. If they send it to you, upload it to your portal and file it. The court will not hear your petition until it is on file.',
          'Tap "I did this" when the notice has been placed.',
        ],
        sources: [SRC.p8121, SRC.p8124, SRC.de121],
        formIds: ['DE-121'],
      });
    }
  }
  // sale of real property with court confirmation: notice of the confirmation hearing (phase 8)
  if (phase >= 8 && proc === 'full') {
    ((c.assets && c.assets.realProperty) || []).forEach((p, i) => {
      const k = `sale.${i + 1}`;
      if (ans(answers, `${k}.amountBid`) === undefined) return;
      const st = mailStep(`mail-notices-sale-${i + 1}`, 8, 2, `notice of the hearing on the sale of ${S(p.address) || 'the property'}`, 'DE-120-SALE', ymd(ans(answers, `${k}.hearingDate`)));
      const buyer = S(ans(answers, `${k}.purchaser`)).split(',')[0];
      if (buyer) st.steps[3] = st.steps[3].replace(/\.$/, `; and the buyer${/ and /.test(buyer) ? 's' : ''}, ${buyer}.`);
      out.push(st);
    });
  }
  // 3. final petition notice (phase 10, full probate)
  if (phase >= 10 && proc === 'full') out.push(mailStep('mail-notices-final', 10, 2, 'notice of the final petition', 'DE-120', hearingDate(c, answers, 'final')));
  return out;
}

module.exports = { buildSteps, procedureOf, SRC };
