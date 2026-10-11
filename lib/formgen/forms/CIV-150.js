// CIV-150 Notice of Limited Scope Representation (Rev. September 1, 2018). Cal. Rules of Court,
// rule 3.36 (opened 2026-10-10): used when Rozsa appears at a hearing for the self-represented
// petitioner ($500 for the hearing, carried over to any continued date; limited scope). Rule 3.35(b) applies rules 3.35 to 3.37 to civil
// cases other than family law; probate is a civil case (rules 1.6(3), 3.10). Form MC-950 no longer
// exists (courts.ca.gov/documents/mc950.pdf returns 404); CIV-150 is the form rule 3.36 names.
// This is the ONLY generated paper that carries the attorney's details (Rozsa decision 2026-10-10).
const firm = require('../firm');
const { courtFor } = require('../courts');
const { filer } = require('../filer');
const { fmtDate } = require('../format');
const { heirs } = require('../people');

function splitAddr(a) {
  const m = String(a).match(/^(.*),\s*([^,]+),\s*([A-Z]{2}\s*\d{5}(?:-\d{4})?)$/);
  return m ? { street: m[1], city: m[2], stateZip: m[3] } : { street: String(a), city: '', stateZip: '' };
}

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
  f.text(`${ci}CrtCounty[0]`, c.county ? { value: c.county, source: c.countySource } : undefined, { item: 'Caption', label: 'County', need: 'court.county' });
  [['Street', c.street], ['MailingAdd', c.mailing], ['CityZip', c.cityZip], ['Branch', c.branch]].forEach(([n, v]) => f.text(`${ci}${n}[0]`, v ? { value: v, source: c.source } : undefined, { item: 'Caption', label: n, need: c.need }));
  const dn = F.v('decedent.name', ID);
  const other = dn && fl.name ? { value: `Estate of ${dn.value}, Decedent; Petitioner ${fl.name.value}`, source: `${dn.source}; ${fl.name.source}` } : undefined;
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
  f.check(`${P1}List2[0].LI1[0].CheckBox1[0]`, true, { item: '2a', label: 'at the hearing', source: 'Optional court appearance purchased ($500; covers any continuance, decision D4)' });
  f.text(`${P1}List2[0].LI1[0].FillText1[0]`, hd ? { value: fmtDate(hd), source: F.src('lsr.hearingDate') } : undefined, { item: '2a', label: 'Hearing date', need: 'lsr.hearingDate' });
  // Rozsa decision D4 (decisions section 25): the appearance covers that hearing and any
  // continuance of it, until the order on that matter. The $500 fee carries over to a continued date.
  f.check(`${P1}List2[0].LI1[0].CheckBox2[0]`, true, { item: '2a', label: 'and at any continuance of that hearing', source: 'Rozsa decision D4 (decisions section 25): covers any continuance of that hearing' });
  f.check(`${P1}List2[0].LI1[0].CheckBox3[0]`, true, { item: '2a', label: 'until submission of the order after hearing', source: 'Rozsa decision D4 (decisions section 25): until the order on that matter' });
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
  f.text('CIV-150[0].Page2[0].SigSub[0].PartyPrintName[0]', fl.name, { item: 'Signatures', label: 'Party printed name', need: 'petitioner.name' });
  f.text('CIV-150[0].Page2[0].SigSub1[0].AttyPrintName[0]', firm.attorneyName, { item: 'Signatures', label: 'Attorney printed name', source: SRC });
  // Proof of service by mail (page 3). Rule 3.36(a): notice is given "by serving and filing" the
  // CIV-150. It is served by mail on the persons who were given notice of the hearing (the DE-121
  // list), by an adult who is not a party (CCP 1013a(1)), who completes items 1 and 3 and signs.
  const P3 = 'CIV-150[0].Page3[0].';
  f.check(`${P3}List2[0].LI1[0].Mail_cb[0]`, true, { item: 'Proof 2a', label: 'deposited with the United States Postal Service', source: 'Mailed by the client\'s adult non-party helper at a post office or mailbox (CCP 1013a(1))' });
  f.check(`${P3}List2[0].LI2[0].Mail_cb[0]`, false, { item: 'Proof 2b', label: 'business collection practice', source: 'Not a business mailroom' });
  const pn = fl.name ? String(fl.name.value).trim().toLowerCase() : '';
  // the client signs the notice, so is not served; everyone else given notice of the hearing is
  const served = heirs(F, ID).filter((h) => !h.deceased && h.address && h.address !== 'Deceased' && String(h.name || '').trim().toLowerCase() !== pn);
  ['LI1', 'LI2', 'LI3', 'LI4'].forEach((li, i) => {
    const h = served[i]; const parts = h ? splitAddr(h.address) : null;
    const it = `Proof 4${'abcd'[i]}`;
    f.text(`${P3}List4[0].${li}[0].FillText1[0]`, h ? { value: h.name, source: h.nameSource } : undefined, { item: it, label: 'Name of person served', blankReason: 'No further person' });
    f.text(`${P3}List4[0].${li}[0].FillText2[0]`, parts ? { value: parts.street, source: h.addrSource } : undefined, { item: it, label: 'Street address', blankReason: 'No further person' });
    f.text(`${P3}List4[0].${li}[0].FillText3[0]`, parts ? { value: parts.city, source: h.addrSource } : undefined, { item: it, label: 'City', blankReason: 'No further person' });
    f.text(`${P3}List4[0].${li}[0].FillText4[0]`, parts ? { value: parts.stateZip, source: h.addrSource } : undefined, { item: it, label: 'State and zip code', blankReason: 'No further person' });
  });
  f.check(`${P3}CheckBox1[0]`, served.length > 4, { item: 'Proof 4', label: 'Additional persons served are attached', source: `${served.length} person(s) given notice of the hearing` });
  if (served.length > 4) ctx.warnings.push(`CIV-150 proof of service: ${served.length - 4} more person(s) to list on POS-030(P).`);
  for (const [n, l] of [['List1[0].LI1[0].FillText1[0]', 'Server residence or business address'], ['List3[0].LI1[0].FillText1[0]', 'Date mailed'], ['List3[0].LI2[0].FillText1[0]', 'Mailed from (city and state)'], ['SigSub[0].DeclarantDate[0]', 'Declarant date'], ['SigSub[0].DeclarantPrintName[0]', 'Declarant name']]) f.text(`${P3}${n}`, undefined, { item: 'Proof', label: l, blankReason: 'Completed by the adult non-party who mails it' });
  ctx.warnings.push('File and serve before or at the hearing (rule 3.36(a)); while it is in effect, papers must be served on both Rozsa and the client (3.36(b)). The client agrees to sign MC-050 when the hearing is done (item 3); if not, use CIV-151.');
}

module.exports = { id: ID, kind: 'jc', title: 'Notice of Limited Scope Representation (hearing appearance)', revision: 'Rev. September 1, 2018', template: 'CIV-150.pdf', sourceUrl: 'https://courts.ca.gov/documents/civ150.pdf', procedures: ['full'], fill };
