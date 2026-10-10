// DE-147S Confidential Supplement to Duties and Liabilities of Personal Representative
// (New January 1, 2001). Confidential: filed with DE-147, not part of the public file.
const { caption } = require('../header');
const { prName } = require('../logic');
const { fmtDate } = require('../format');

const ID = 'DE-147S';
const L = 'DE-147S[0].Page1[0].SubformSet[0].List1[0].';

async function fill(f, F) {
  caption(f, F, { estateFields: ['DE-147S[0].Page1[0].P1Header[0].CaptionSub[0].Estate[0].Party_ft[0]'], caseFields: ['DE-147S[0].Page1[0].P1Header[0].CaptionSub[0].CaseNumSub[0].CaseNumber_ft[0]'] });
  const pr = prName(F, ID);
  f.text(`${L}LI1[0].TextField2[0]`, pr, { item: '1', label: 'Name of personal representative', need: 'petitioner.name' });
  const dob = F.get('pr.dateOfBirth', ID, { label: 'Personal representative date of birth (confidential, DE-147S)', type: 'date' });
  f.text(`${L}LI2[0].DateField1[0]`, dob ? { value: fmtDate(dob), source: F.src('pr.dateOfBirth') } : undefined, { item: '2', label: 'Date of birth', need: 'pr.dateOfBirth' });
  const dl = F.get('pr.driverLicense', ID, { label: "Personal representative driver's license number (confidential, DE-147S)", type: 'text' });
  f.text(`${L}LI3[0].TextField1[0]`, dl ? { value: dl, source: F.src('pr.driverLicense') } : undefined, { item: '3', label: "Driver's license number", need: 'pr.driverLicense' });
  const st = F.get('pr.driverLicenseState', ID, { label: "State that issued the personal representative's driver's license", type: 'text' });
  f.text(`${L}LI3[0].TextField2[0]`, st ? { value: st, source: F.src('pr.driverLicenseState') } : undefined, { item: '3', label: 'State', need: 'pr.driverLicenseState' });
}

module.exports = { id: ID, kind: 'jc', title: 'Confidential Supplement to Duties and Liabilities of Personal Representative', revision: 'New January 1, 2001', template: 'DE-147S.pdf', sourceUrl: 'https://courts.ca.gov/documents/de147s.pdf', procedures: ['full'], confidential: true, fill };
