// Client steps for the out-of-app tasks (Rozsa's decision 22): filing the papers, mailing the court
// notices, and newspaper publication. One source of truth for the wording:
//   - the generator renders these as PDF guides (FILING-STEPS, MAILING-STEPS, PUBLICATION-STEPS);
//   - the portal Cloud Functions write them to cases/{caseId}/clientSteps (W3-home's shape), from
//     a synced copy of this file (portal functions/formsSteps/clientStepsContent.js; keep in sync
//     with scripts/sync-client-steps.sh).
// No dependencies, so the same file runs in Node (Netlify) and in Cloud Functions.
// Plain words, no consultation wording, no location of the office. Every legal statement carries a
// source opened 2026-10-10 or 2026-10-11 (build-evidence/W3-forms/sources/scope, notice-pub,
// statutes-1011).

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
function fullName(p) { return p ? [p.firstName, p.middleName, p.lastName, p.suffix].map(S).filter(Boolean).join(' ') : ''; }
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
  ccp1010c: { cite: 'Code Civ. Proc. 1010.6(c)(3) ("The act of electronic filing shall not be construed as express consent.")', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1010.6' },
  crc2251: { cite: 'Cal. Rules of Court, rule 2.251(c)(3)(B)', url: 'https://courts.ca.gov/cms/rules/index/two/rule2_251' },
  p8480: { cite: 'Prob. Code 8480(a), (c)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=8480' },
  p8404: { cite: 'Prob. Code 8404(a)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=8404' },
  lr430: { cite: 'LASC Local Rule 4.30(a), (c)', url: 'https://www.lacourt.ca.gov/pages/lp/rules/cp/local-rules' },
  p13151: { cite: 'Prob. Code 13151(b)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13151' },
  p13152: { cite: 'Prob. Code 13152(b), (e)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13152' },
  p13153: { cite: 'Prob. Code 13153', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13153' },
  p13655: { cite: 'Prob. Code 13655', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13655' },
  p10308: { cite: 'Prob. Code 10308(c)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=10308' },
  p1230: { cite: 'Prob. Code 1230 (the clerk posts the notice)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=1230' },
  p11601: { cite: 'Prob. Code 11601', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=11601' },
  p10586: { cite: 'Prob. Code 10586', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=10586' },
  p9050: { cite: 'Prob. Code 9050, 9051', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=9051' },
  p9202: { cite: 'Prob. Code 9202', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=9202' },
  p9250: { cite: 'Prob. Code 9250(a), (b)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=9250' },
  p10300: { cite: 'Prob. Code 10300', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=10300' },
  g6063a: { cite: 'Gov. Code 6063a', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=6063a' },
  g70626: { cite: 'Gov. Code 70626(b)(8); LASC Probate eFiling Document Types and Fees (DE-305: $45)', url: 'https://lascpubstorage.blob.core.windows.net/cpw/LIBWEBRESOURCE-275-ProbateEfilingDocumentTypesAndFees.pdf' },
  lascFees: { cite: 'LASC Probate eFiling Document Types and Fees ($435)', url: 'https://lascpubstorage.blob.core.windows.net/cpw/LIBWEBRESOURCE-275-ProbateEfilingDocumentTypesAndFees.pdf' },
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
  const at = (txt) => txt.replace(/\.\.$/, '.'); // "4:30 p.m." at the end of a sentence
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
          ...(la ? ['Sign and date the Los Angeles cover sheet (form PRO 010) where your name is printed. It is filed with the affidavit.'] : []),
          'Attach a certified copy of the death certificate, the inventory and appraisal of the property (forms DE-160 and DE-161, after the probate referee has valued it), and form DE-300 (they are listed on the form).',
          at(`File it ${la ? `in person or by mail at ${where}, or online through any e-filing company on the court's approved list` : 'with the probate clerk of your county superior court'}.`),
          `Pay the filing fee${la ? ' of $45, which includes one certified copy of the filed affidavit' : ' the clerk tells you (set by Government Code 70626(b)(8), and it includes one certified copy)'}. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with it.`,
          'Ask the clerk for a certified copy of the filed affidavit. Record that copy with the County Recorder where the property is located.',
          'Upload the file-stamped copy to your portal. Then tap "I did this".',
        ],
        sources: [{ cite: 'Prob. Code 13200, 13202', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13200' }, SRC.g70626, ...(la ? [SRC.lr45, SRC.laFiling, SRC.efsp] : []), SRC.crc2253, SRC.fw001],
        formIds: ['DE-305', 'PRO-010', 'DE-160', 'DE-161'],
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
        // M2 (Rozsa, ninth message): the proposed order is always part of the petition package the client files
        ...(proc === 'full' ? ['File the proposed Order for Probate (form DE-140) we prepared together with your petition. The judge signs it at the hearing.'] : []),
        la ? 'To file online, choose any e-filing company from the court\'s approved list. E-filing is optional for you because you represent yourself. Filing online does not mean you agree to get court papers by email. Agree to that only if you want it.' : 'Check your court\'s website for online filing. People who represent themselves do not have to e-file.',
        at(`To file in person or by mail, go to ${where}.`),
        ...(proc === '13151' ? ['Attach to the petition the inventory and appraisal of the house by the probate referee (forms DE-160 and DE-161, as Attachment 8) and form DE-300 (the current dollar limits).'] : []),
        la ? `Pay the filing fee of $435. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your ${proc === 'full' ? 'petition' : 'papers'}.` : 'Pay the filing fee the clerk tells you. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your papers.',
        ...(proc === '13151' ? ['Within five business days after you file, the notice of the hearing must be mailed to every heir and beneficiary named in the petition. See the next step, "Have the notice mailed".'] : []),
        ...(proc === 'full' && willExists ? ['The original will cannot be filed online. If it has not already been deposited with the court, deliver the original to the clerk on paper.'] : []),
        'Upload the file-stamped copy to your portal. Then tap "I did this".',
      ],
      sources: [SRC.crc2253, SRC.ccp1010, SRC.ccp1010c, SRC.crc2251, ...(la ? [SRC.lr47, SRC.lr45, SRC.laFiling, SRC.efsp, SRC.lascFees] : []), ...(proc === 'full' ? [SRC.fee] : []), ...(proc === '13151' ? [SRC.p13152, SRC.p13151] : []), SRC.fw001],
      formIds: proc === 'full' ? ['DE-111', 'DE-140', 'PRO-010'] : proc === '13151' ? ['DE-310', 'PRO-010', 'DE-160', 'DE-161'] : ['DE-221', 'PRO-010'],
    });
  }
  // 2. mailing the notice (phase 3)
  const heirsList = (Array.isArray(c.heirs) ? c.heirs : []).filter((h) => !h.isDeceased && fullName(h).toLowerCase() !== fullName(c.petitioner).toLowerCase());
  const mailStep = (key, phaseN, order, label, formId, hd, sources, extra = {}) => ({
    key, phase: phaseN, order, title: `Have the notice mailed: ${label}`,
    why: 'Before the hearing, the court notice must be mailed to everyone listed on it. The law does not let you mail it yourself: another adult who is not part of the case mails it and signs the proof of mailing.',
    steps: [
      'Ask an adult friend or relative (18 or older) who is not part of the case and inherits nothing from the estate, and who lives or works in the county where they mail it.',
      'Print the notice. Put one copy in a separate envelope for each person listed on page 2, even people at the same address.',
      extra.deadline || `Mail each envelope by first-class mail with postage paid${hd ? `, no later than ${longDate(minusDays(hd, 15))} (at least 15 days before the hearing on ${longDate(hd)})` : ', at least 15 days before the hearing'}.`,
      `The people to mail to are: ${[...heirsList.map((h) => `${fullName(h)}${h.address ? ` (${oneLine(h.address)})` : ''}`), ...(extra.more || [])].join('; ') || 'the people listed on page 2 of the notice'}.`,
      'On page 2, the person who mailed it checks the box saying they deposited the envelopes with the United States Postal Service (box 3a), fills in their own address, the date and city where they mailed it, prints their name and signs.',
      'Upload the signed notice with its proof page to your portal, then file it with the court before the hearing, the same way you filed your papers. Then tap "I did this".',
    ],
    sources: [...sources, SRC.p1260, SRC.ccp1013a, SRC.crc751, SRC.selfhelp],
    formIds: [formId],
  });
  const noticeSources = { full: [SRC.p8110, SRC.p1220, SRC.p1215], '13151': [SRC.p13153, SRC.p1220, SRC.p13151], '13650': [SRC.p13655, SRC.p1220] };
  if (phase >= 3) {
    const hd = hearingDate(c, answers, 'petition');
    out.push(mailStep('mail-notices', 3, 2, proc === 'full' ? 'notice of your petition' : 'notice of the hearing', proc === 'full' ? 'DE-121' : 'DE-120', hd, noticeSources[proc] || noticeSources.full,
      proc === '13151' ? { deadline: `Mail each envelope by first-class mail with postage paid within five business days after you file the petition${hd ? `, and in any case no later than ${longDate(minusDays(hd, 15))} (15 days before the hearing on ${longDate(hd)})` : ', and at least 15 days before the hearing'}.` } : {}));
    if (proc === 'full') {
      const paper = S(ans(answers, 'petition.newspaper'));
      const city = S(c.decedent && c.decedent.lastAddress && c.decedent.lastAddress.city);
      out.push({
        key: 'publication', phase: 3, order: 3, title: 'Publish the notice in the newspaper',
        why: 'The notice of your petition must be printed in a newspaper three times before the hearing. You place it yourself with one call or email to the newspaper.',
        steps: [
          paper ? `Use ${paper}, a newspaper of general circulation in ${city || 'the city where the decedent lived'}.` : `Use a newspaper of general circulation published in the city where ${name} lived${city ? ` (${city})` : ''}. If there is none, one in the county. We tell you which one when your papers are ready.`,
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
  // after the hearing: the papers the clerk needs to issue Letters (stage 6, full probate; Rozsa, 2026-10-12, sixth message:
  // after the order and with the bond, before stage 7; Probate Code 8403, 8404, 8480(a); LASC Local Rule 4.30(a))
  if (phase >= 6 && proc === 'full') {
    out.push({
      key: 'letters-papers', phase: 6, order: 1, title: 'Give the court the papers for your Letters',
      why: 'When the judge appoints you, the clerk issues your Letters (the paper that proves you are in charge) only after you hand in a few signed papers.',
      steps: [
        'Read and sign the Duties and Liabilities of Personal Representative (form DE-147). The law requires it before Letters are issued.',
        'Fill in and sign the Confidential Supplement (form DE-147S). It has your date of birth and driver\'s license number, so it is kept out of the public court file: hand it in separately and never attach it to anything else.',
        'Sign the Letters (form DE-150, the affirmation on the right side).',
        'If the court\'s order requires a bond, get the bond from a bonding company. The clerk issues your Letters only after the bond is filed.',
        ...(la ? [at(`Hand in the signed Letters, DE-147, DE-147S and the bond, if one is ordered, together ${north ? 'at the Antelope Valley courthouse' : `at ${where}`}, or file them online the same way you filed your petition. The bond itself is handed in on paper.`)] : ['Hand them in to the probate clerk, with the bond if one is ordered, or file them online the same way you filed your petition.']),
        'When the clerk gives you your Letters, upload a copy to your portal. Then tap "I did this".',
      ],
      sources: [SRC.p8404, SRC.p8480, ...(la ? [SRC.lr430, SRC.lr47, SRC.lascFees] : [])],
      formIds: ['DE-150', 'DE-147', 'DE-147S'],
    });
  }
  // notices due after Letters (phase 7, full probate)
  if (phase >= 7 && proc === 'full') {
    const ld = ymd(ans(answers, 'letters.date') || (c.keyDates && c.keyDates.lettersIssued) || (c.letters && c.letters.issuedDate));
    const plus = (d, months) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + months, dd)).toISOString().slice(0, 10); };
    out.push({
      key: 'mail-creditor-notice', phase: 7, order: 2, title: 'Have the notice to creditors mailed',
      why: 'Each creditor you know about (anyone who has asked the decedent or the estate for payment) must be mailed a notice so they can file a claim.',
      steps: [
        'Ask an adult who is not part of the case and inherits nothing to mail it, as with the court notice.',
        'Print the Notice of Administration to Creditors (form DE-157). Put one copy in a separate envelope for each creditor listed.',
        `Mail them by first-class mail${ld ? ` by ${longDate(plus(ld, 4))} (four months after your Letters were issued on ${longDate(ld)})` : ' within four months after your Letters are issued'}. A creditor you learn about later must be mailed within 30 days after you learn about them.`,
        'The person who mailed it completes and signs the proof of mailing on the notice.',
        'Upload the signed notice to your portal and file it with the court the same way you filed your petition. Then tap "I did this".',
      ],
      sources: [SRC.p9050, SRC.p1215, SRC.ccp1013a],
      formIds: ['DE-157'],
    });
    const agencies = ['NOTICE-9202-DHCS', 'NOTICE-9202-FTB'];
    out.push({
      key: 'mail-agency-notices', phase: 7, order: 3, title: 'Mail the notices to the state agencies',
      why: 'The law requires notice of the death to certain state agencies within 90 days after your Letters are issued.',
      steps: [
        'Sign each letter we prepared where your name is printed.',
        'Make the copies listed under "Enclosures" on each letter and put them in the envelope with it.',
        `Mail each letter by first-class mail${ld ? ` by ${longDate(minusDays(ld, -90))} (90 days after your Letters were issued on ${longDate(ld)})` : ' within 90 days after your Letters are issued'}. Keep a copy of each letter and write the date you mailed it on your copy.`,
        'Upload your copies to your portal. Then tap "I did this".',
      ],
      sources: [SRC.p9202, SRC.p1215],
      formIds: agencies,
    });
  }
  // creditor claims answered (phase 9, full probate): one step per claim in the file
  if (phase >= 9 && proc === 'full') {
    (Array.isArray(c.creditorClaims) ? c.creditorClaims : []).forEach((cl, i) => {
      out.push({
        key: `mail-claim-decision-${i + 1}`, phase: 9, order: 2, title: `Send your decision on the claim of ${S(cl.claimantName) || `creditor ${i + 1}`}`,
        why: 'When you allow or reject a creditor\'s claim, the creditor must be told in writing, on the form we prepared.',
        steps: [
          'Sign the Allowance or Rejection of Creditor\'s Claim (form DE-174) where your name is printed.',
          'Ask an adult who is not part of the case to mail a copy to the creditor at the address on the claim, and to complete and sign the proof of mailing on page 2.',
          'File the signed form with the court the same way you filed your petition, and upload a copy to your portal. Then tap "I did this".',
        ],
        sources: [SRC.p9250, SRC.ccp1013a],
        formIds: ['DE-174'],
      });
    });
  }
  // proposed actions under independent administration (phase 8): notice at least 15 days ahead
  if (phase >= 8 && proc === 'full') {
    (Array.isArray(c.proposedActions) ? c.proposedActions : []).forEach((a, i) => {
      const on = ymd(a.actionDate || a.dateOfAction);
      out.push({
        key: `mail-nopa-${i + 1}`, phase: 8, order: 3, title: `Have the notice of proposed action mailed: ${S(a.title || a.description).slice(0, 60) || `action ${i + 1}`}`,
        why: 'Before you take this step without a court hearing, everyone entitled to notice must get the Notice of Proposed Action at least 15 days ahead, so they can object.',
        steps: [
          'Sign the Notice of Proposed Action (form DE-165) where your name is printed.',
          'Ask an adult who is not part of the case to mail one copy, with a blank objection page, to each person listed, in a separate envelope.',
          `It must be mailed${on ? ` no later than ${longDate(minusDays(on, 15))} (15 days before ${longDate(on)}, the date in the notice)` : ' at least 15 days before the date in the notice'}. Do not take the action before that date.`,
          'The person who mailed it completes and signs the proof of mailing.',
          'Upload the signed notice with its proof to your portal. Then tap "I did this".',
        ],
        sources: [SRC.p10586, SRC.p1215, SRC.ccp1013a],
        formIds: ['DE-165'],
      });
    });
  }
  // sale of real property with court confirmation: publication of the notice of sale, then notice
  // of the confirmation hearing (phase 8)
  if (phase >= 8 && proc === 'full') {
    ((c.assets && c.assets.realProperty) || []).forEach((p, i) => {
      const k = `sale.${i + 1}`;
      const paper = S(ans(answers, `${k}.newspaper`));
      const saleOn = ymd(ans(answers, `${k}.saleOnOrAfter`));
      if (ans(answers, `${k}.saleOnOrAfter`) !== undefined || ans(answers, `${k}.amountBid`) !== undefined) {
        out.push({
          key: `publish-sale-${i + 1}`, phase: 8, order: 1, title: `Publish the notice of sale of ${S(p.address) || 'the property'}`,
          why: 'Before the property can be sold, the notice of sale must be printed in a newspaper three times.',
          steps: [
            `Use ${paper || 'a newspaper published in the county where the property is located'}.`,
            'Send the newspaper\'s legal notices department the Notice of Sale of Real Property we prepared. Ask them to print it exactly as written.',
            `Ask them to publish it three times, with at least five days between the first and the last time, so that publication is finished${saleOn ? ` before ${longDate(saleOn)}, the date in the notice on or after which the sale may be made` : ' before the date in the notice on or after which the sale may be made'}. Pay them directly.`,
            'Ask them for the proof of publication. Upload it to your portal and file it with the court before the confirmation hearing.',
            'Tap "I did this" when the notice has been placed.',
          ],
          sources: [SRC.p10300, SRC.g6063a],
          formIds: ['NOTICE-OF-SALE'],
        });
      }
      if (ans(answers, `${k}.amountBid`) === undefined) return;
      const buyers = S(ans(answers, `${k}.purchaser`)).split(',')[0].split(/\s+and\s+|;/).map(S).filter(Boolean);
      const baddr = S(ans(answers, `${k}.purchaserAddress`));
      const more = buyers.map((b) => `${b}, the buyer${baddr ? ` (${baddr})` : ''}`);
      const st = mailStep(`mail-notices-sale-${i + 1}`, 8, 2, `notice of the hearing on the sale of ${S(p.address) || 'the property'}`, 'DE-120-SALE', ymd(ans(answers, `${k}.hearingDate`)), [SRC.p10308, SRC.p1220, SRC.p1230], { more });
      out.push(st);
    });
  }
  // 3. final petition notice (phase 10, full probate)
  if (phase >= 10 && proc === 'full') out.push(mailStep('mail-notices-final', 10, 2, 'notice of the final petition', 'DE-120', hearingDate(c, answers, 'final'), [SRC.p11601, SRC.p1220]));
  return out;
}

module.exports = { buildSteps, procedureOf, SRC };
