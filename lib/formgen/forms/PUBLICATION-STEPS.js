// "How to publish the notice in the newspaper": plain steps for the self-represented petitioner
// (full probate only; publication applies to the petition to administer, Prob. Code 8120).
// Sources opened 2026-10-10 (build-evidence/W3-forms/sources/notice-pub/): Prob. Code 8121(a)
// (three publications, first at least 15 days before the hearing, at least five days between the
// first and last), 8121(b) (a newspaper of general circulation in the city where the decedent
// lived; if none, as the statute provides), 8123 (type sizes), 8124 (no hearing until the
// affidavit of publication is filed); DE-121's own NOTE on what to print. Whether a Los Angeles
// newspaper files the proof itself was not confirmed from an official source, so the client is
// told to ask the newspaper (as the Alameda Superior Court self-help page advises).
const { buildPlainDoc } = require('../plaindoc');
const { docFields } = require('../docfields');
const { addDays, longDate } = require('../format');

const ID = 'PUBLICATION-STEPS';

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const pet = d.t('petitioner.name', { label: 'Petitioner name' });
  const city = F.opt('decedent.residence') && typeof F.opt('decedent.residence') === 'object' ? F.opt('decedent.residence').city : (F.caseData.decedent && F.caseData.decedent.lastAddress && F.caseData.decedent.lastAddress.city);
  if (city) d.calc('publication.city', 'City where the decedent lived', city, 'case.decedent.lastAddress.city', 'Newspaper');
  const paper = d.t('petition.newspaper', { label: `Newspaper for publication: a newspaper of general circulation in ${city || 'the city where the decedent lived'} (Prob. Code 8121(b))`, item: 'Newspaper' });
  const hd = d.raw('hearing.date', { label: 'Hearing date on the petition for probate', type: 'date' });
  const firstBy = hd ? addDays(hd, -15) : undefined;
  if (firstBy) d.calc('publication.firstBy', 'First publication no later than', longDate(firstBy), 'computed: hearing date minus 15 days (Prob. Code 8121(a))', 'When');
  const blocks = [
    { type: 'para', text: `Hi ${pet}. The notice of your petition must be printed in a newspaper three times before the hearing. You place the notice yourself; it takes one phone call or email to the newspaper. Here is exactly what to do.` },
    { type: 'para', bold: true, text: '1. Which newspaper' },
    { type: 'para', text: `Use ${paper}. The law requires a newspaper of general circulation in the city where ${name} lived${city ? ` (${city})` : ''}.` },
    { type: 'para', bold: true, text: '2. What to send them' },
    { type: 'para', text: `Send the newspaper's legal notices department page 1 of your Notice of Petition to Administer Estate (form DE-121) after the court has given you the case number and hearing date. Tell them to print it starting with the words "NOTICE OF PETITION TO ADMINISTER ESTATE", including the case number, and not to print the parts the form says to leave out (the box above the title, the instructions in parentheses, the item numbers, and page 2).` },
    { type: 'para', bold: true, text: '3. What to ask for' },
    { type: 'para', text: `Ask them to publish it three times, with the first time no later than ${firstBy ? longDate(firstBy) : '15 days before the hearing'} (at least 15 days before the hearing on ${hd ? longDate(hd) : 'the hearing date'}), and at least five days between the first and the last time. Ask for the price, and pay them directly.` },
    { type: 'para', text: 'Ask them for the "proof of publication" (an affidavit they sign). Ask whether they file it with the court for you or send it to you. If they send it to you, upload it to your portal and file it with the court. The court will not hear your petition until the proof of publication is on file.' },
    { type: 'para', text: 'Questions at any step? Send us a message in your portal.' },
    { type: 'para', italic: true, text: 'Sources (opened October 10, 2026): Probate Code sections 8120, 8121, 8123 and 8124; form DE-121 (Rev. January 1, 2013), NOTE on page 1.' },
  ];
  const doc = await buildPlainDoc({ title: ['How to publish the notice in the newspaper', `Estate of ${name}`], blocks });
  return { doc, fields: d.fields };
}

function notNeeded(F) {
  const st = String(F.caseData.serviceType || '').toLowerCase();
  return /simplif|13151|residence|succession|spous|13650|small/.test(st) ? 'No newspaper publication in this procedure (publication applies to a petition to administer, Prob. Code 8120).' : null;
}

module.exports = { id: ID, kind: 'doc', title: 'How to publish the notice in the newspaper (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full'], notNeeded, build };
