// "How to file your court papers": plain-words steps for the client, who files as a
// self-represented petitioner (Rozsa's decision of 2026-10-10). Sources opened 2026-10-10 are
// listed at the end of the document. Los Angeles steps are specific; other counties get the court
// address from the verified court table and are told to check that court's own e-filing page.
const { buildPlainDoc } = require('../plaindoc');
const { docFields } = require('../docfields');
const { courtFor } = require('../courts');
const { addDays, longDate } = require('../format');

const ID = 'FILING-STEPS';

function procedureOf(F) {
  const st = String(F.caseData.serviceType || '').toLowerCase();
  if (/simplif|13151|residence|succession/.test(st)) return '13151';
  if (/spous|13650|partner/.test(st)) return '13650';
  if (/small/.test(st) && (F.caseData.assets && (F.caseData.assets.realProperty || []).length)) return '13200';
  if (/small/.test(st)) return '13100';
  return 'full';
}

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const pet = d.t('petitioner.name', { label: 'Petitioner name' });
  const c = courtFor(F, ID);
  const la = c.county && /^los angeles$/i.test(c.county);
  const north = F.opt('court.courthouse') === 'antelope-valley';
  const proc = procedureOf(F);
  d.calc('procedure', 'Procedure', proc, 'case.serviceType', 'Steps');
  const where = la
    ? (north ? 'Michael Antonovich Antelope Valley Courthouse, 42011 4th St. West, Lancaster, CA 93534 (1st floor), 8:30 a.m. to 4:30 p.m., phone (661) 483-5790'
      : 'Stanley Mosk Courthouse, 111 N. Hill St., Los Angeles, CA 90012, 4th floor, Room 429, 8:30 a.m. to 4:30 p.m., phone (213) 830-0800')
    : c.street ? `${c.branch}, ${c.street}, ${c.cityZip}` : '[ANSWER NEEDED: court address]';
  if (proc === '13100') {
    const doc = await buildPlainDoc({ title: ['Collecting the property with your affidavit', `Estate of ${name}`], blocks: [
      { type: 'para', text: `Hi ${pet}. A small estate affidavit is not filed with the court. You give it to each bank or company that holds the property, with a certified copy of the death certificate. Wait at least 40 days after the date of death before you use it.` },
      { type: 'para', text: 'Sign the affidavit in front of a notary or show the holder your ID, as they ask. Keep a copy of everything you hand over.' },
      { type: 'para', text: 'Questions? Send us a message in your portal.' },
      { type: 'para', italic: true, text: 'Sources: Probate Code sections 13100, 13101 and 13104 (leginfo.legislature.ca.gov, opened October 10, 2026).' },
    ] });
    return { doc, fields: d.fields };
  }
  const papers = {
    full: ['your Petition for Probate (form DE-111), signed by you on the last page, with a copy of the will attached if there is one', 'the Los Angeles cover sheet (form PRO 010), signed by you', 'any signed bond waivers from the heirs (form DE-142), if your papers include them'],
    '13151': ['your Petition to Determine Succession to Primary Residence (form DE-310), signed by you, with its attachments (the appraisal on forms DE-160 and DE-161, form DE-300, and a copy of the will if there is one)', 'the Los Angeles cover sheet (form PRO 010), signed by you'],
    '13650': ['your Spousal or Domestic Partner Property Petition (form DE-221), signed by you, with its attachments', 'the Los Angeles cover sheet (form PRO 010), signed by you'],
    '13200': ['your Affidavit re Real Property of Small Value (form DE-305), signed in front of a notary, with the appraisal (forms DE-160 and DE-161), a certified copy of the death certificate and form DE-300', 'the Los Angeles cover sheet (form PRO 010), signed by you'],
  }[proc];
  if (!la) papers.splice(papers.findIndex((x) => /PRO 010/.test(x)), 1);
  const blocks = [
    { type: 'para', text: `Hi ${pet}. We have prepared your court papers. You file them yourself, as the petitioner, in your own name. Here is exactly how.` },
    { type: 'para', bold: true, text: '1. Check and sign' },
    { type: 'para', text: `Read every page. If anything is wrong or missing, send us a message in your portal before you sign. Then sign and date where your name is printed. The papers you file are: ${papers.join('; ')}.` },
  ];
  if (proc === 'full' && F.opt('will.exists') === true) blocks.push({ type: 'para', text: 'The original will cannot be filed online. If it has not already been deposited with the court, take or mail the original to the clerk (the deposit fee is $50).' });
  blocks.push(
    { type: 'para', bold: true, text: '2. File: online or in person (your choice)' },
    la
      ? { type: 'para', text: `Online: you may e-file through any e-filing company on the court's approved list (lacourt.ca.gov/apps/efiling-providers/ejs). E-filing is optional for you because you are representing yourself. If you e-file, you agree to receive court papers by email. Each document is a separate PDF. In person or by mail: ${where}.` }
      : { type: 'para', text: `File at ${where}. Check that court's website for e-filing; people who represent themselves are not required to e-file (California Rules of Court, rule 2.253(b)(2)).` },
    { type: 'para', bold: true, text: '3. Pay the filing fee' },
    { type: 'para', text: proc === 'full' ? 'The fee for a Petition for Probate is $435. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your petition and the clerk will process them together.' : 'The clerk will tell you the filing fee. If you cannot afford it, file a Request to Waive Court Fees (form FW-001) with your papers.' },
    { type: 'para', bold: true, text: '4. After you file' },
    { type: 'para', text: 'The clerk gives you a case number and a hearing date. Upload the file-stamped copy to your portal. We then prepare the notices that go out before the hearing and tell you exactly what to mail and when.' },
    { type: 'para', text: la ? 'Before the hearing, the court posts "Probate Notes" online. If they list "Matters To Clear", we prepare what is needed, and it must be filed by the third court day before the hearing.' : 'Before the hearing, the court may post notes on what it still needs. We prepare what is needed for you to file.' },
    { type: 'para', text: 'You go to the hearing yourself, or you can choose to have Rozsa Gyene appear with you for that hearing ($500 per hearing). If you choose that, you both sign a Notice of Limited Scope Representation (form CIV-150) for that hearing.' },
    { type: 'para', text: 'Questions at any step? Send us a message in your portal.' },
    { type: 'para', italic: true, text: 'Sources (opened October 10, 2026): Cal. Rules of Court, rules 2.111(1), 2.253(b)(2), 3.36, 3.37 (courts.ca.gov); Code of Civil Procedure section 1010.6(g)(4); LASC Local Rules 2.3(a)(1)(A), 4.3(a), 4.4(b), 4.5 and 4.7(b) and (c), edition effective July 1, 2026 (lacourt.ca.gov); LASC "Filing My Probate Documents" and probate e-filing pages; Statewide Civil Fee Schedule effective January 1, 2026 (Gov. Code 70650) and Gov. Code 70626(d); form FW-001 (Rev. March 1, 2026).' },
  );
  void addDays; void longDate;
  const doc = await buildPlainDoc({ title: ['How to file your court papers', `Estate of ${name}`], blocks });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'How to file your court papers (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full', '13151', '13650', '13100', '13200'], build };
