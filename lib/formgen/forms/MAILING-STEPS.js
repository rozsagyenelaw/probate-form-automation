// "How to mail the court notices": plain steps for the self-represented petitioner, with the
// prepared notices and their proof of mailing. One per notice (DE-121 for the petition to
// administer; DE-120 for 13151, spousal, sale confirmation and final distribution hearings).
// Sources opened 2026-10-10 (build-evidence/W3-forms/sources/notice-pub/):
//   Prob. Code 8110 and 1220(a)(1) (deliver notice at least 15 days before the hearing, by 1215),
//   1215(a) (first-class mail, sealed, postage prepaid), 1260(a) (proof at or before the hearing),
//   1261 and CCP 1013a(1) (proof of mailing by a person over 18 and not a party),
//   Cal. Rules of Court 7.51 (mail to each person individually and directly; separate envelopes),
//   Judicial Council self-help, formal probate: "Another adult who is not a party to the case mails
//   the notice. You cannot mail the notice." DE-121 / DE-120 page 2 item 1.
const { buildPlainDoc } = require('../plaindoc');
const { docFields } = require('../docfields');
const { heirs } = require('../people');
const { addDays, longDate } = require('../format');

const ID = 'MAILING-STEPS';

function records(F) {
  const st = String(F.caseData.serviceType || '').toLowerCase();
  const out = [];
  if (!/simplif|13151|residence|succession|spous|13650|small/.test(st)) out.push({ label: 'Notice of the petition for probate (DE-121)', form: 'DE-121', dateKey: 'hearing.date' });
  if (/simplif|13151|residence|succession/.test(st)) out.push({ label: 'Notice of hearing on the primary residence petition (DE-120)', form: 'DE-120', dateKey: 'hearing.date' });
  if (/spous|13650/.test(st)) out.push({ label: 'Notice of hearing on the spousal property petition (DE-120)', form: 'DE-120', dateKey: 'hearing.date' });
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  rp.forEach((p, i) => { if (F.opt(`sale.${i + 1}.amountBid`) !== undefined) out.push({ label: `Notice of hearing on the sale of ${p.address || 'the property'} (DE-120)`, form: 'DE-120', dateKey: `sale.${i + 1}.hearingDate` }); });
  if (!/simplif|13151|residence|succession|spous|13650|small/.test(st)) out.push({ label: 'Notice of hearing on the final petition (DE-120)', form: 'DE-120', dateKey: 'final.hearingDate' });
  return out;
}

async function build(F, ctx) {
  const d = docFields(F, ID);
  const r = ctx.record;
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const pet = d.t('petitioner.name', { label: 'Petitioner name' });
  const hd = d.raw(r.dateKey, { label: `Hearing date for: ${r.label}`, type: 'date' });
  const lastDay = hd ? addDays(hd, -15) : undefined;
  if (lastDay) d.calc('mailing.lastDay', 'Last day to mail (15 days before the hearing)', longDate(lastDay), `computed: ${r.dateKey} minus 15 days (Prob. Code 8110 / 1220(a)(1))`, 'When');
  const petName = String(F.opt('petitioner.name') || '').toLowerCase();
  const people = heirs(F, ID).filter((h) => !h.deceased && h.name.toLowerCase() !== petName);
  const blocks = [
    { type: 'para', text: `Hi ${pet}. Before the court hearing, the notice we prepared (${r.label}) must be mailed to everyone listed on it. The law does not let you mail it yourself. Here is how.` },
    { type: 'para', bold: true, text: '1. Ask someone to do the mailing' },
    { type: 'para', text: 'Ask an adult friend or relative (18 or older) who is not part of the case and inherits nothing from the estate, and who lives or works in the county where they mail it. They do the mailing and sign the proof.' },
    { type: 'para', bold: true, text: '2. What they mail, and when' },
    { type: 'para', text: `Print the notice. Put one copy in a separate envelope for each person listed on page 2 of the notice, even people who live at the same address. Mail each envelope by first-class mail with postage paid${lastDay ? `, no later than ${longDate(lastDay)} (at least 15 days before the hearing on ${longDate(hd)})` : ', at least 15 days before the hearing'}.` },
    { type: 'para', text: `The people listed are: ${people.length ? people.map((h) => `${h.name}${h.address ? ` (${h.address})` : ' (address needed)'}`).join('; ') : '[ANSWER NEEDED: persons to notify]'}.${r.form === 'DE-120' && /sale/.test(r.label) ? ' The buyers of the property are on the list too.' : ''}` },
    { type: 'para', bold: true, text: '3. They sign the proof of mailing' },
    { type: 'para', text: 'On page 2 of the notice, the person who mailed it fills in their own address, the date and the city where they mailed it, checks how they mailed it, prints their name, and signs. The names and addresses of the people mailed to are already filled in.' },
    { type: 'para', bold: true, text: '4. Send us the signed page' },
    { type: 'para', text: 'Upload the signed notice, with its proof page, to your portal. We check it, then you file it with the court before the hearing, the same way you filed your petition.' },
    { type: 'para', text: 'Questions at any step? Send us a message in your portal.' },
    { type: 'para', italic: true, text: 'Sources (opened October 10, 2026): Probate Code sections 8110, 1215, 1220, 1260 and 1261; Code of Civil Procedure section 1013a; Cal. Rules of Court, rule 7.51; Judicial Council self-help guide, formal probate ("Another adult who is not a party to the case mails the notice. You cannot mail the notice.").' },
  ];
  const doc = await buildPlainDoc({ title: ['How to mail the court notice', `Estate of ${name}`], blocks });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'How to mail the court notice (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full', '13151', '13650'], records, build };
