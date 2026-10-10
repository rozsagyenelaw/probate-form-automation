// CIV-150 Notice of Limited Scope Representation (Rev. September 1, 2018). Cal. Rules of Court,
// rule 3.36 (opened 2026-10-10): used when Rozsa appears at a hearing for the self-represented
// petitioner ($500 per hearing, limited scope). Rule 3.35(b) applies rules 3.35 to 3.37 to civil
// cases other than family law; probate is a civil case (rules 1.6(3), 3.10). Form MC-950 no longer
// exists (courts.ca.gov/documents/mc950.pdf returns 404); CIV-150 is the form rule 3.36 names.
// This is the ONLY generated paper that carries the attorney's details (Rozsa decision 2026-10-10).
const firm = require('../firm');
const { courtFor } = require('../courts');
const { filer } = require('../filer');
const { fmtDate } = require('../format');

const ID = 'CIV-150';
const P1 = 'CIV-150[0].Page1[0].';
const C = `${P1}p1Caption[0].`;
const SRC = 'Attorney block (lib/formgen/firm.js): limited scope notice only';

async function fill(f, F, ctx) {
  const A = `${C}AttyInfo[0].`;
  [['BarNo', firm.barNumber], ['AttyName', firm.attorneyName], ['AttyFirm', firm.firmName], ['AttyStreet', firm.street], ['AttyCity', firm.city], ['AttyState', firm.state], ['AttyZip', firm.zip], ['Phone', firm.phone], ['Email', firm.email]]
    .forEach(([n, v]) => f.text(`${A}${n}[0]`, v, { item: 'Caption', label: n, source: SRC }));
  f.text(`${A}Fax[0]`, '', { item: 'Caption', label: 'Fax', blankReason: 'No fax' });
  const fl = filer(F, ID);
  f.text(`${A}AttyFor[0]`, fl.name ? { value: `Petitioner ${fl.name.value} (limited scope)`, source: fl.name.source } : undefined, { item: 'Caption', label: 'Attorney for', need: 'petitioner.name' });
  const c = courtFor(F, ID);
  const ci = `${C}CourtInfo[0].`;
  f.text(`${ci}CrtCounty[0]`, c.county ? { value: c.county.toUpperCase(), source: c.countySource } : undefined, { item: 'Caption', label: 'County', need: 'court.county' });
  [['Street', c.street], ['MailingAdd', c.mailing], ['CityZip', c.cityZip], ['Branch', c.branch]].forEach(([n, v]) => f.text(`${ci}${n}[0]`, v ? { value: v, source: c.source } : undefined, { item: 'Caption', label: n, need: c.need }));
  const dn = F.v('decedent.name', ID);
  const other = dn && fl.name ? { value: `Estate of ${dn.value.toUpperCase()}, Decedent; Petitioner ${fl.name.value}`, source: `${dn.source}; ${fl.name.source}` } : undefined;
  for (const pg of [`${C}TitlePartyName[0].`, 'CIV-150[0].Page2[0].pXCaption[0].TitlePartyName[0].', 'CIV-150[0].Page3[0].pXCaption[0].TitlePartyName[0].']) {
    f.text(`${pg}Party1[0]`, undefined, { item: 'Caption', label: 'Plaintiff', blankReason: 'Probate: parties shown on the OTHER line' });
    f.text(`${pg}Party2[0]`, undefined, { item: 'Caption', label: 'Defendant', blankReason: 'Probate: parties shown on the OTHER line' });
    f.text(`${pg}Party3[0]`, other, { item: 'Caption', label: 'Other', need: 'decedent.name' });
  }
  const cn = F.v('case.number', ID);
  for (const n of [`${C}captionSub[0].CaseNumber[0].CaseNumber[0]`, 'CIV-150[0].Page2[0].pXCaption[0].CaseNumber[0].CaseNumber[0]', 'CIV-150[0].Page3[0].pXCaption[0].CaseNumber[0].CaseNumber[0]']) f.text(n, cn, { item: 'Caption', label: 'Case number', need: 'case.number' });
  f.text(`${C}captionSub[0].HearingInfosf[0].JudOfficer[0]`, F.opt('hearing.judge') ? F.v('hearing.judge') : undefined, { item: 'Caption', label: 'Judge', blankReason: 'Not in file' });
  f.text(`${C}captionSub[0].HearingInfosf[0].Department[0]`, F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: 'Caption', label: 'Dept.', blankReason: 'Not in file' });
  f.check(`${C}FormTitle[0].Amended_cb[0]`, false, { item: 'Title', label: 'Amended', source: 'Original notice' });
  // 1. parties
  f.text(`${P1}List1[0].LI1[0].FillText1[0]`, firm.attorneyName, { item: '1', label: 'Attorney (name)', source: SRC });
  f.text(`${P1}List1[0].LI1[0].FillText2[0]`, fl.name, { item: '1', label: 'Party (name)', need: 'petitioner.name' });
  f.check(`${P1}List1[0].LI1[0].PartyIndicate_cb[0]`, true, { item: '1', label: 'petitioner/plaintiff', source: 'The client is the petitioner' });
  f.check(`${P1}List1[0].LI1[0].PartyIndicate_cb1[0]`, false, { item: '1', label: 'respondent/defendant' });
  f.check(`${P1}List1[0].LI1[0].PartyIndicate_cb2[0]`, false, { item: '1', label: 'other' });
  f.text(`${P1}List1[0].LI1[0].FillText3[0]`, undefined, { item: '1', blankReason: 'Not other' });
  // 2a. the hearing Rozsa attends (one notice per hearing bought)
  const hd = F.get('lsr.hearingDate', ID, { label: 'Limited scope appearance: date of the hearing Rozsa will attend', type: 'date' });
  f.check(`${P1}List2[0].LI1[0].CheckBox1[0]`, true, { item: '2a', label: 'at the hearing', source: 'Optional court appearance purchased ($500 per hearing)' });
  f.text(`${P1}List2[0].LI1[0].FillText1[0]`, hd ? { value: fmtDate(hd), source: F.src('lsr.hearingDate') } : undefined, { item: '2a', label: 'Hearing date', need: 'lsr.hearingDate' });
  const cont = F.get('lsr.includeContinuance', ID, { label: 'Limited scope appearance: also cover any continuance of that hearing? (each hearing is $500)', type: 'yesno' });
  f.check(`${P1}List2[0].LI1[0].CheckBox2[0]`, cont, { item: '2a', label: 'and at any continuance of that hearing', source: F.src('lsr.includeContinuance'), need: 'lsr.includeContinuance' });
  const order = F.get('lsr.untilOrder', ID, { label: 'Limited scope appearance: continue until the order after hearing is submitted?', type: 'yesno' });
  f.check(`${P1}List2[0].LI1[0].CheckBox3[0]`, order, { item: '2a', label: 'until submission of the order after hearing', source: F.src('lsr.untilOrder'), need: 'lsr.untilOrder' });
  for (const n of ['LI2[0].CheckBox1[0]', 'LI2[0].CheckBox2[0]', 'LI2[0].CheckBox3[0]', 'LI3[0].OtherScope_cb[0]']) f.check(`${P1}List2[0].${n}`, false, { item: '2b/2c', source: 'Hearing appearance only' });
  f.text(`${P1}List2[0].LI2[0].FillText[0]`, undefined, { item: '2b', blankReason: 'No trial' });
  f.text(`${P1}List2[0].LI3[0].FillText1[0]`, undefined, { item: '2c', blankReason: 'Hearing appearance only' });
  // 4. the party's address for service
  const P2 = 'CIV-150[0].Page2[0].List4[0].LI1[0].';
  f.text(`${P2}FillText1[0]`, fl.name, { item: '4', label: 'Party name', need: 'petitioner.name' });
  f.text(`${P2}FillText2[0]`, fl.oneLine, { item: '4', label: 'Party address for service', need: 'petitioner.address' });
  f.text(`${P2}FillText3[0]`, fl.phone, { item: '4', label: 'Party telephone', need: 'petitioner.phone' });
  f.text(`${P2}FillText4[0]`, undefined, { item: '4', label: 'Fax', blankReason: 'No fax' });
  f.text('CIV-150[0].Page2[0].SigSub[0].PartySigDate[0]', undefined, { item: 'Signatures', label: 'Party date', blankReason: 'Dated when signed' });
  f.text('CIV-150[0].Page2[0].SigSub1[0].AttySigDate[0]', undefined, { item: 'Signatures', label: 'Attorney date', blankReason: 'Dated when signed' });
  ctx.warnings.push('File and serve before or at the hearing (rule 3.36(a)); while it is in effect, papers must be served on both Rozsa and the client (3.36(b)). The client agrees to sign MC-050 when the hearing is done (item 3); if not, use CIV-151.');
}

module.exports = { id: ID, kind: 'jc', title: 'Notice of Limited Scope Representation (hearing appearance)', revision: 'Rev. September 1, 2018', template: 'CIV-150.pdf', sourceUrl: 'https://courts.ca.gov/documents/civ150.pdf', procedures: ['full'], fill };
