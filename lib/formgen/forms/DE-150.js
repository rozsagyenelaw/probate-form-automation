// DE-150 Letters (Rev. January 1, 1998). Fixes report D6: the institutional fiduciary section is
// left blank for an individual, the unused appointment line stays empty, and the affirmation
// date is left for the personal representative to complete when signing.
const { header, caption, petitionerFor } = require('../header');
const { capacity, prName } = require('../logic');

const ID = 'DE-150';
const P = 'DE-150[0].Page1[0].';
const T = `${P}P1Caption[0].FormTitle[0].`;

async function fill(f, F) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const cap = capacity(F, ID); const c = cap && cap.value; const src = cap && cap.source;
  const iaea = F.get('petition.iaeaAuthority', ID);
  f.check(`${T}CheckBox23[0]`, c ? c === 'executor' : undefined, { item: 'Title', label: 'Testamentary', source: src, need: 'pr.capacity' });
  f.check(`${T}CheckBox21[0]`, c ? c === 'administrator' : undefined, { item: 'Title', label: 'Of administration', source: src });
  f.check(`${T}CheckBox22[0]`, c ? c === 'administrator with will annexed' : undefined, { item: 'Title', label: 'Of administration with will annexed', source: src });
  f.check(`${T}CheckBox20[0]`, false, { item: 'Title', label: 'Special administration', source: 'not requested' });
  const pr = prName(F, ID);
  const willCase = c === 'executor' || c === 'administrator with will annexed';
  f.check(`${P}Choice1[4]`, c ? willCase : undefined, { item: '1', label: 'Will proved; court appoints', source: src });
  f.text(`${P}FillText1[0]`, willCase ? pr : undefined, { item: '1', label: 'Name', blankReason: 'Not a will case' });
  f.check(`${P}Choice1[0]`, c ? c === 'executor' : undefined, { item: '1a', label: 'executor', source: src });
  f.check(`${P}Choice1[1]`, c ? c === 'administrator with will annexed' : undefined, { item: '1b', label: 'administrator with will annexed', source: src });
  f.check(`${P}Choice1[5]`, c ? c === 'administrator' : undefined, { item: '2', label: 'The court appoints', source: src });
  f.text(`${P}FillText1[2]`, c === 'administrator' ? pr : undefined, { item: '2', label: 'Name', blankReason: 'Will case (item 1 used)' });
  f.check(`${P}Choice1[6]`, c ? c === 'administrator' : undefined, { item: '2a', label: 'administrator', source: src });
  for (const n of ['Choice1[7]', 'CheckBox5[0]', 'CheckBox6[0]', 'CheckBox7[0]']) f.check(`${P}${n}`, false, { item: '2b', label: 'special administrator', source: 'not requested' });
  f.text(`${P}FillText1[3]`, undefined, { item: '2b(3)', blankReason: 'Not a special administration' });
  f.check(`${P}Choice1[2]`, iaea === undefined ? undefined : iaea !== 'none', { item: '3', label: 'Authorized under IAEA', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  f.check(`${P}Choice2[0]`, iaea === undefined ? undefined : iaea === 'full', { item: '3', label: 'with full authority', source: F.src('petition.iaeaAuthority') });
  f.check(`${P}Choice2[1]`, iaea === undefined ? undefined : iaea === 'limited', { item: '3', label: 'with limited authority', source: F.src('petition.iaeaAuthority') });
  const blocked = F.opt('petition.blockedAccount'); const hasBlocked = blocked && !/^none$/i.test(String(blocked).trim());
  f.check(`${P}Choice1[3]`, !!hasBlocked, { item: '4', label: 'Not authorized to take possession without order', source: hasBlocked ? F.src('petition.blockedAccount') : 'none in file' });
  // affirmation: an individual personal representative
  f.check(`${P}Choice1[8]`, false, { item: 'Affirmation 1', label: 'Public administrator', source: 'PR is an individual (case.petitioner)' });
  f.check(`${P}Choice1[9]`, true, { item: 'Affirmation 2', label: 'Individual', source: 'PR is an individual (case.petitioner)' });
  f.check(`${P}Choice1[10]`, false, { item: 'Affirmation 3', label: 'Institutional fiduciary', source: 'PR is an individual' });
  f.text(`${P}FillText1[4]`, undefined, { item: 'Affirmation 3', label: 'Institutional fiduciary name', blankReason: 'PR is an individual' });
  f.text(`${P}FillText1[1]`, undefined, { item: 'Affirmation 3', label: 'Officer name and title', blankReason: 'PR is an individual' });
  f.text(`${P}HearingTime[0]`, undefined, { item: 'Affirmation 4', label: 'Executed on (date)', blankReason: 'Dated when the PR signs' });
  f.text(`${P}HearingTime[1]`, undefined, { item: 'Affirmation 4', label: 'at (place), California', blankReason: 'Completed when the PR signs' });
}

module.exports = { id: ID, kind: 'jc', title: 'Letters', revision: 'Rev. January 1, 1998', template: 'DE-150.pdf', sourceUrl: 'https://courts.ca.gov/documents/de150.pdf', procedures: ['full'], fill };
