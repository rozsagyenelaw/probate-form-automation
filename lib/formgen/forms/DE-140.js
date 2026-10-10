// DE-140 Order for Probate (Rev. January 1, 1998). A proposed order: the judge signs and dates it.
// Fixes report D5: no probate referee is ever filled from the petitioner, the judge's date is
// blank, and hearing details come only from the case record (never invented).
const { header, caption, petitionerFor } = require('../header');
const { fmtDate, money } = require('../format');
const { capacity, prName, bondStatus } = require('../logic');

const ID = 'DE-140';
const P = 'DE-140[0].Page1[0].';
const T = `${P}P1Caption[0].FormTitle[0].`;

async function fill(f, F) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const cap = capacity(F, ID);
  const c = cap && cap.value;
  const iaea = F.get('petition.iaeaAuthority', ID);
  f.check(`${T}CheckBox23[0]`, c ? c === 'executor' : undefined, { item: 'Title', label: 'Executor', source: cap && cap.source, need: 'pr.capacity' });
  f.check(`${T}CheckBox22[0]`, c ? c === 'administrator with will annexed' : undefined, { item: 'Title', label: 'Administrator with Will Annexed', source: cap && cap.source });
  f.check(`${T}CheckBox21[0]`, c ? c === 'administrator' : undefined, { item: 'Title', label: 'Administrator', source: cap && cap.source });
  f.check(`${T}CheckBox20[0]`, false, { item: 'Title', label: 'Special Administrator', source: 'not requested' });
  f.check(`${T}CheckBox17[0]`, iaea === undefined ? undefined : iaea !== 'none', { item: 'Title', label: 'Order Authorizing Independent Administration', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  f.check(`${T}CheckBox18[1]`, iaea === undefined ? undefined : iaea === 'full', { item: 'Title', label: 'with full authority', source: F.src('petition.iaeaAuthority') });
  f.check(`${T}CheckBox18[0]`, iaea === undefined ? undefined : iaea === 'limited', { item: 'Title', label: 'with limited authority', source: F.src('petition.iaeaAuthority') });
  // 1. hearing: from the case record only
  const hd = F.get('hearing.date', ID);
  f.text(`${P}HearingDate[0]`, hd ? { value: fmtDate(hd), source: F.src('hearing.date') } : undefined, { item: '1', label: 'Date of hearing', need: 'hearing.date' });
  f.text(`${P}HearingTime[0]`, F.v('hearing.time', ID), { item: '1', label: 'Time', need: 'hearing.time' });
  const dept = F.get('hearing.dept', ID); const room = F.opt('hearing.room');
  f.text(`${P}HearingDept[0]`, dept ? { value: room ? `${dept}/${room}` : dept, source: F.src('hearing.dept') } : undefined, { item: '1', label: 'Dept./Room', need: 'hearing.dept' });
  f.text(`${P}HearingRm[0]`, F.opt('hearing.judge') ? F.v('hearing.judge') : undefined, { item: '1', label: 'Judge', blankReason: 'Judge not in file' });
  // 2. decedent
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${P}FillText143[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '2a', label: 'Decedent died on', need: 'decedent.dateOfDeath' });
  const ca = F.get('decedent.caResident', ID);
  f.check(`${P}CheckBox45[0]`, ca, { item: '2b', label: 'resident of the county', source: F.src('decedent.caResident'), need: 'decedent.caResident' });
  f.check(`${P}CheckBox45[1]`, ca === undefined ? undefined : ca === false, { item: '2b', label: 'nonresident', source: F.src('decedent.caResident') });
  const will = F.get('will.exists', ID);
  f.check(`${P}CheckBox89[0]`, will === undefined ? undefined : will === false, { item: '2c', label: 'intestate', source: F.src('will.exists') });
  f.check(`${P}CheckBox89[1]`, will, { item: '2c', label: 'testate', source: F.src('will.exists') });
  const wd = will ? F.get('will.date', ID) : undefined;
  f.text(`${P}FillText1[0]`, wd ? { value: fmtDate(wd), source: F.src('will.date') } : undefined, { item: '2c', label: 'Will dated', need: will ? 'will.date' : undefined, blankReason: 'No will' });
  const cod = will ? F.opt('will.codicilDates') : undefined;
  f.text(`${P}FillText1[1]`, cod && !/^none$/i.test(cod) ? F.v('will.codicilDates') : undefined, { item: '2c', label: 'Codicil dated', blankReason: 'No codicil' });
  f.text(`${P}FillText1[2]`, F.opt('will.admittedDate') ? { value: fmtDate(F.opt('will.admittedDate')), source: F.src('will.admittedDate') } : undefined, { item: '2c', label: 'Will admitted by minute order on', blankReason: 'Completed by the court' });
  // 3. appointment
  const pr = prName(F, ID);
  f.text(`${P}FillText1[3]`, pr, { item: '3', label: '(Name) is appointed personal representative', need: 'petitioner.name' });
  f.check(`${P}Choice1[0]`, c ? c === 'executor' : undefined, { item: '3a', label: 'executor of the will', source: cap && cap.source });
  f.check(`${P}Choice1[1]`, c ? c === 'administrator with will annexed' : undefined, { item: '3b', label: 'administrator with will annexed', source: cap && cap.source });
  f.check(`${P}Choice1[2]`, c ? c === 'administrator' : undefined, { item: '3c', label: 'administrator', source: cap && cap.source });
  for (const n of ['Choice2[0]', 'CheckBox5[0]', 'CheckBox6[0]', 'CheckBox7[0]', 'CheckBox8[0]']) f.check(`${P}${n}`, false, { item: '3d', label: 'special administrator options', source: 'not requested' });
  f.text(`${P}SigDate[1]`, undefined, { item: '3d', blankReason: 'Not a special administration' });
  // 4. IAEA
  f.check(`${P}CheckBox41[0]`, iaea === undefined ? undefined : iaea === 'full', { item: '4', label: 'Full IAEA authority granted', source: F.src('petition.iaeaAuthority') });
  f.check(`${P}CheckBox41[1]`, iaea === undefined ? undefined : iaea === 'limited', { item: '4', label: 'Limited IAEA authority granted', source: F.src('petition.iaeaAuthority') });
  // 5. bond
  const bs = bondStatus(F, ID);
  const noBond = bs.required === false;
  const bondAmt = bs.required === true ? F.get('petition.bondAmount', ID) : undefined;
  f.check(`${P}Choice1[3]`, bs.required === undefined ? undefined : noBond, { item: '5a', label: 'Bond is not required', source: bs.source, need: 'will.waivesBond' });
  f.check(`${P}Choice1[4]`, bs.required === undefined ? undefined : bs.required, { item: '5b', label: 'Bond is fixed at', source: bs.source });
  f.text(`${P}HearingTime[1]`, bondAmt !== undefined ? { value: money(bondAmt), source: F.src('petition.bondAmount') } : undefined, { item: '5b', label: 'Bond amount', blankReason: noBond ? 'Bond not required' : '', need: bs.required ? 'petition.bondAmount' : undefined });
  const blocked = F.opt('petition.blockedAccount'); const hasBlocked = blocked && !/^none$/i.test(String(blocked).trim());
  f.check(`${P}Choice1[5]`, !!hasBlocked, { item: '5c', label: 'Deposits in blocked account', source: hasBlocked ? F.src('petition.blockedAccount') : 'none in file' });
  f.text(`${P}HearingTime[2]`, undefined, { item: '5c', label: 'Blocked amount', blankReason: hasBlocked ? 'See institution text' : 'No blocked account' });
  f.text(`${P}FillText1[4]`, hasBlocked ? F.v('petition.blockedAccount') : undefined, { item: '5c', label: 'Institution and location', blankReason: 'No blocked account' });
  f.check(`${P}limited[0]`, false, { item: '5c', label: 'Additional orders in Attachment 5c', source: 'none' });
  f.check(`${P}Choice1[6]`, !!hasBlocked, { item: '5d', label: 'PR not authorized to take possession without court order', source: hasBlocked ? F.src('petition.blockedAccount') : 'none in file' });
  // 6. probate referee: appointed by the court. Never the petitioner.
  const ref = F.opt('referee.name');
  f.check(`${P}CheckBox5[1]`, !!ref, { item: '6', label: 'Probate referee appointed', source: ref ? F.src('referee.name') : 'Court appoints the referee' });
  f.text(`${P}FillText1[5]`, ref ? F.v('referee.name') : undefined, { item: '6', label: 'Probate referee (name)', blankReason: 'Appointed by the court (never the petitioner)' });
  f.text(`${P}SigDate[0]`, undefined, { item: 'Judge', label: 'Date', blankReason: 'Dated by the judge' });
  f.text(`${P}NumericField1[0]`, undefined, { item: 'Judge', label: 'Number of pages attached', blankReason: 'No attachments' });
  f.check(`${P}limited[1]`, false, { item: 'Judge', label: 'Signature follows last attachment', source: 'No attachments' });
}

module.exports = { id: ID, kind: 'jc', title: 'Order for Probate', revision: 'Rev. January 1, 1998', template: 'DE-140.pdf', sourceUrl: 'https://courts.ca.gov/documents/de140.pdf', procedures: ['full'], fill };
