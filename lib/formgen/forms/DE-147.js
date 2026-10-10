// DE-147 Duties and Liabilities of Personal Representative (Rev. January 1, 2002).
const { header, caption } = require('../header');
const { prName } = require('../logic');
const { oneLineAddress } = require('../facts');

const ID = 'DE-147';
const P2 = 'DE-147[0].Page2[0].';

async function fill(f, F) {
  header(f, F, { attorneyFor: (() => { const p = F.get('petitioner.name', ID); return p ? { value: `Petitioner ${p}`, source: F.src('petitioner.name') } : undefined; })() });
  caption(f, F);
  const addr = F.v('petitioner.address', ID); const phone = F.v('petitioner.phone', ID);
  f.text(`${P2}TEXT\\.5\\.1\\.1[0]`, addr && phone ? { value: `${oneLineAddress(addr.value)}\n${phone.value}`, source: `${addr.source}; ${phone.source}` } : undefined, { item: 'Acknowledgment', label: 'PR address and telephone', need: !addr ? 'petitioner.address' : 'petitioner.phone' });
  f.text(`${P2}SigDate[0]`, undefined, { item: 'Acknowledgment', label: 'Date', blankReason: 'Dated when the PR signs' });
  const pr = prName(F, ID);
  f.text(`${P2}SigName[0]`, pr ? { value: pr.value, source: pr.source } : undefined, { item: 'Acknowledgment', label: 'Name of PR', need: 'petitioner.name' });
  f.text(`${P2}SigDate[1]`, undefined, { item: 'Acknowledgment', blankReason: 'One personal representative' });
  f.text(`${P2}SigName[1]`, undefined, { item: 'Acknowledgment', blankReason: 'One personal representative' });
}

module.exports = { id: ID, kind: 'jc', title: 'Duties and Liabilities of Personal Representative', revision: 'Rev. January 1, 2002', template: 'DE-147.pdf', sourceUrl: 'https://courts.ca.gov/documents/de147.pdf', procedures: ['full'], fill };
