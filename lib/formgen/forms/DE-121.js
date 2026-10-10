// DE-121 Notice of Petition to Administer Estate (Rev. January 1, 2013). Prob. Code 8100, 8110.
// Replaces DE-120 for a petition to administer an estate (DE-120's own footnote says so).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { fmtDate, longDate } = require('../format');
const { appendTableAttachment } = require('../attach');

const ID = 'DE-121';
const P1 = 'DE-121[0].Page1[0].';
const P2 = 'DE-121[0].Page2[0].';

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const name = F.v('decedent.name', ID);
  const aka = F.opt('decedent.aka');
  const allNames = name ? { value: `${name.value.toUpperCase()}${aka && !/^none$/i.test(aka) ? `, also known as ${aka}` : ''}`, source: `${name.source}${aka ? `; ${F.src('decedent.aka')}` : ''}` } : undefined;
  if (aka === undefined) F.need('decedent.aka', ID);
  f.text(`${P1}p1Caption[0].FormTitle[0].Name1[0]`, name ? { value: name.value.toUpperCase(), source: name.source } : undefined, { item: 'Title', label: 'Notice of petition to administer estate of (name)', need: 'decedent.name' });
  f.text(`${P1}Capacity1[0]`, allNames, { item: '1', label: 'All names by which the decedent was known', need: 'decedent.name' });
  const pn = F.v('petitioner.name', ID);
  f.text(`${P1}FillText109[0]`, pn, { item: '2', label: 'Petition filed by', need: 'petitioner.name' });
  const county = F.v('court.county', ID);
  f.text(`${P1}FillText109[1]`, county ? { value: county.value, source: county.source } : undefined, { item: '2', label: 'County', need: 'court.county' });
  f.text(`${P1}FillText109[2]`, pn, { item: '3', label: 'Requests that (name) be appointed', need: 'petitioner.name' });
  const will = F.get('will.exists', ID);
  f.check(`${P1}#area[0].CheckBox1[0]`, will, { item: '4', label: 'Will admitted to probate', source: F.src('will.exists'), need: 'will.exists' });
  const iaea = F.get('petition.iaeaAuthority', ID);
  f.check(`${P1}#area[1].CheckBox1[1]`, iaea === undefined ? undefined : iaea !== 'none', { item: '5', label: 'IAEA authority requested', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  const hd = F.get('hearing.date', ID);
  f.text(`${P1}HearingDate_dt[0]`, hd ? { value: fmtDate(hd), source: F.src('hearing.date') } : undefined, { item: '6a', label: 'Hearing date', need: 'hearing.date' });
  f.text(`${P1}HearingTime_dt[0]`, F.v('hearing.time', ID), { item: '6a', label: 'Hearing time', need: 'hearing.time' });
  f.text(`${P1}HearingDept_ft[0]`, F.v('hearing.dept', ID), { item: '6a', label: 'Dept.', need: 'hearing.dept' });
  f.text(`${P1}HearingRoom_ft[0]`, F.opt('hearing.room') ? F.v('hearing.room') : undefined, { item: '6a', label: 'Room', blankReason: 'No room in file' });
  const same = F.get('hearing.sameAddress', ID, { label: 'Is the hearing at the court address shown in the caption?', type: 'yesno' });
  f.check(`${P1}RB2Choices1[0]`, same, { item: '6b', label: 'same as noted above', source: F.src('hearing.sameAddress'), need: 'hearing.sameAddress' });
  f.check(`${P1}RB2Choices1[1]`, same === undefined ? undefined : same === false, { item: '6b', label: 'other', source: F.src('hearing.sameAddress') });
  f.text(`${P1}HearingDept_ft[1]`, same === false ? F.v('hearing.otherAddress', ID, { label: 'Hearing court address (if not the caption address)' }) : undefined, { item: '6b', label: 'Other address', blankReason: 'Same as caption' });
  // 10: the petitioner (self-represented)
  const fl = require('../filer').filer(F, ID);
  f.check(`${P1}#area[2].limited[0]`, true, { item: '10', label: 'Petitioner', source: 'Petitioner is self-represented' });
  f.check(`${P1}#area[3].limited[1]`, false, { item: '10', label: 'Attorney for petitioner', source: 'No attorney of record' });
  f.text(`${P1}TextField6[0]`, fl.name, { item: '10', label: 'Name', need: 'petitioner.name' });
  f.text(`${P1}Datemail[0]`, fl.oneLine, { item: '10', label: 'Address', need: 'petitioner.address' });
  f.text(`${P1}placemail[0]`, fl.phone, { item: '10', label: 'Telephone', need: 'petitioner.phone' });

  // page 2: proof of service by mail is completed by the person who mails it. Only the list of
  // persons to be served is prefilled, from the heirs list (Prob. Code 8110), without the petitioner.
  for (const n of ['poston_date[0]', 'Datemail[0]', 'placemail[0]', '#area[3].Date[0]', '#area[3].PrintName[0]']) f.text(`${P2}${n}`, undefined, { item: 'Proof of service', blankReason: 'Completed by the person who mails the notice' });
  for (const n of ['#area[0].CheckBox3a[0]', '#area[1].CheckBox3b[0]', '#area[2].CheckBoxCopy[0]']) f.check(`${P2}${n}`, false, { item: 'Proof of service', source: 'Completed by the person who mails the notice' });
  const petName = (F.opt('petitioner.name') || '').toLowerCase();
  const serve = heirs(F, ID).filter((h) => !h.deceased && h.name.toLowerCase() !== petName);
  const slots = [['servname1[0]', 'servaddy1[0]'], ['servname2[0]', 'servaddy2[0]'], ['servname3[0]', 'servaddy3[0]'], ['servname4[0]', 'servaddy4[0]'], ['servname5[0]', 'servaddy5[0]'], ['servname5[1]', 'servaddy5[1]']];
  const fits = serve.length <= slots.length;
  slots.forEach(([nf, af], i) => {
    const h = fits ? serve[i] : undefined;
    f.text(`${P2}${nf}`, h ? { value: h.name, source: h.nameSource } : undefined, { item: 'Persons served', label: `Name ${i + 1}`, blankReason: fits ? 'no more persons' : 'See attachment' });
    f.text(`${P2}${af}`, h && h.address ? { value: h.address, source: h.addrSource } : undefined, { item: 'Persons served', label: `Address ${i + 1}`, need: h && !h.address ? `${h.key}.address` : undefined, blankReason: fits ? 'no more persons' : 'See attachment' });
  });
  f.check(`${P2}#area[4].CheckBoxAttach[0]`, !fits, { item: 'Persons served', label: 'Continued on an attachment', source: `${serve.length} persons` });
  if (!fits) ctx.attach = { rows: serve.map((h) => [h.name, h.address]) };
  ctx.warnings.push('Mail at least 15 days before the hearing to every heir, devisee and named executor (Prob. Code 8110); publish under 8121 (three publications, first at least 15 days before the hearing).');
  void longDate;
}

module.exports = {
  id: ID, kind: 'jc', title: 'Notice of Petition to Administer Estate', revision: 'Rev. January 1, 2013', template: 'DE-121.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de121.pdf', procedures: ['full'],
  fill,
  after: async (doc, F, ctx) => {
    if (ctx.attach) await appendTableAttachment(doc, { estate: (F.opt('decedent.name') || '').toUpperCase(), caseNumber: F.opt('case.number') || '', formId: ID, title: 'ATTACHMENT: NAME AND ADDRESS OF EACH PERSON TO WHOM NOTICE WAS MAILED', columns: [{ title: 'Name', width: 200 }, { title: 'Address', width: 340 }], rows: ctx.attach.rows });
  },
};
