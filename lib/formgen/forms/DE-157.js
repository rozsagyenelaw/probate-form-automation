// DE-157 Notice of Administration to Creditors (Rev. January 1, 2013). Prob. Code 9050, 9051, 9052.
// One notice for the estate; the known creditors are prefilled in the list of persons to be
// served on page 2 (proof of service is completed by the person who mails it).
const { caption } = require('../header');
const { courtFor } = require('../courts');
const { fmtDate } = require('../format');
const { oneLineAddress } = require('../facts');
const { prName } = require('../logic');
const { creditors } = require('../admin-helpers');
const { appendTableAttachment } = require('../attach');

const ID = 'DE-157';
const P1 = 'DE-157[0].Page1[0].';
const P2 = 'DE-157[0].Page2[0].';

async function fill(f, F, ctx) {
  caption(f, F, { estateFields: [`${P2}#subform[0].Party_ft[0]`], caseFields: [`${P2}#subform[0].CaseNumber_ft[0]`] });
  const dn = F.v('decedent.name', ID);
  f.text(`${P1}Party_ft[1]`, dn ? { value: dn.value, source: dn.source } : undefined, { item: 'Title', label: 'Notice of administration of the estate of (name)', need: 'decedent.name' });
  f.text(`${P1}Party_ft[0]`, dn ? { value: dn.value, source: dn.source } : undefined, { item: '1', label: 'Personal representative of the estate of (name)', need: 'decedent.name' });
  const pr = prName(F, ID);
  f.text(`${P1}TextField2[0]`, pr, { item: '1', label: 'Personal representative (name)', need: 'petitioner.name' });
  const addr = F.v('petitioner.address', ID);
  f.text(`${P1}TextField2[1]`, addr ? { value: oneLineAddress(addr.value), source: addr.source } : undefined, { item: '1', label: 'Personal representative address', need: 'petitioner.address' });
  f.text(`${P1}TextField2[2]`, F.v('petitioner.phone', ID), { item: '1', label: 'Personal representative telephone', need: 'petitioner.phone' });
  // 2. court where administration is pending
  const c = courtFor(F, ID);
  f.text(`${P1}TextField2[3]`, c.county ? { value: c.county, source: c.countySource } : undefined, { item: '2a', label: 'County', need: 'court.county' });
  f.text(`${P1}TextField2[4]`, c.street ? { value: c.street, source: c.source } : undefined, { item: '2a', label: 'Court street address', need: c.need });
  f.text(`${P1}TextField2[5]`, c.mailing ? { value: c.mailing, source: c.source } : undefined, { item: '2a', label: 'Court mailing address', need: c.need });
  f.text(`${P1}TextField2[6]`, c.cityZip ? { value: c.cityZip, source: c.source } : undefined, { item: '2a', label: 'Court city and ZIP', need: c.need });
  f.text(`${P1}TextField2[7]`, c.branch ? { value: c.branch, source: c.source } : undefined, { item: '2a', label: 'Branch name', need: c.need });
  f.text(`${P1}CaseNumber_ft[0]`, F.v('case.number', ID), { item: '2b', label: 'Case number', need: 'case.number' });
  // 3. dates: letters date from the case; mailing date is written when the notice is mailed
  const ld = F.get('letters.date', ID);
  f.text(`${P1}DateField2[0]`, ld ? { value: fmtDate(ld), source: F.src('letters.date') } : undefined, { item: '3a', label: 'Date letters first issued', need: 'letters.date' });
  f.text(`${P1}DateField2[1]`, undefined, { item: '3b', label: 'Date this notice was mailed or delivered', blankReason: 'Written when the notice is mailed' });
  // page 2: proof of service by mail
  for (const n of ['_2LineTR12[0]', 'TextField2[0]', 'DateField2[0]', 'SigDate[0]']) f.text(`${P2}${n}`, undefined, { item: 'Proof of service', blankReason: 'Completed by the person who mails the notice' });
  for (const n of ['two[0]', 'ThreeA[0]', 'ThreeB[0]']) f.check(`${P2}${n}`, false, { item: 'Proof of service', source: 'Completed by the person who mails the notice' });
  const cr = creditors(F, ID);
  const fits = cr.length <= 8;
  for (let i = 0; i < 8; i++) {
    const c2 = fits ? cr[i] : undefined;
    f.text(`${P2}TextField2[${1 + i * 2}]`, c2 ? { value: c2.name, source: c2.nameSource } : undefined, { item: 'Persons served', label: `Name ${i + 1}`, blankReason: fits ? 'no more creditors in file' : 'See attachment' });
    f.text(`${P2}TextField2[${2 + i * 2}]`, c2 && c2.address ? { value: c2.address, source: c2.addrSource } : undefined, { item: 'Persons served', label: `Address ${i + 1}`, need: c2 && !c2.address ? `${c2.key}.address` : undefined, blankReason: fits ? 'no more creditors in file' : 'See attachment' });
  }
  f.check(`${P2}#area[0].Listofnames[0]`, !fits, { item: 'Persons served', label: 'List continued in attachment', source: `${cr.length} known creditors in file` });
  if (!fits) ctx.attach = cr.map((x) => [x.name, x.address]);
  if (!cr.length) ctx.warnings.push('No known creditors in the file: confirm before deciding no DE-157 is needed.');
  ctx.warnings.push('Mail to each known or reasonably ascertainable creditor within the later of 4 months after letters or 30 days after learning of the creditor (Prob. Code 9050, 9051), with a blank Creditor\'s Claim (DE-172).');
}

module.exports = {
  id: ID, kind: 'jc', title: 'Notice of Administration to Creditors', revision: 'Rev. January 1, 2013', template: 'DE-157.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de157.pdf', procedures: ['full'], fill,
  after: async (doc, F, ctx) => { if (ctx.attach) await appendTableAttachment(doc, { estate: (F.opt('decedent.name') || ''), caseNumber: F.opt('case.number') || '', formId: ID, title: 'ATTACHMENT: NAME AND ADDRESS OF EACH PERSON TO WHOM NOTICE WAS MAILED', columns: [{ title: 'Name', width: 200 }, { title: 'Address', width: 340 }], rows: ctx.attach }); },
};
