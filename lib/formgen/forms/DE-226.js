// DE-226 Spousal or Domestic Partner Property Order (Rev. January 1, 2015). Prob. Code 13656.
// Proposed order; the judicial officer signs. Attachments 5a and 7a carry the property
// descriptions from the petition (Attachments 7a and 7b of DE-221).
const { header, caption, petitionerFor } = require('../header');
const { courtFor } = require('../courts');
const { fmtDate } = require('../format');
const { appendTableAttachment } = require('../attach');
const { partnerKind } = require('./DE-221');

const ID = 'DE-226';
const P = 'topmostSubform[0].Page1[0].';
const C = `${P}P1Header_sf[0].CrtInfo_sf[0].`;

async function fill(f, F, ctx) {
  // the template caps the email and "attorney for" fields at 15 characters, which cuts off
  // rozsa@myprobateca.com and the petitioner's name; the boxes are wide enough without the cap
  for (const n of ['EMail_ft[0]', 'EMail_ft[1]']) f.field(`${P}P1Header_sf[0].AttyPartyInfo_sf[0].${n}`).setMaxLength(undefined);
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  const c = courtFor(F, ID);
  const set = (n, v, label) => f.text(`${C}${n}`, v, { item: 'Caption', label, need: c.need || 'court.county' });
  set('Crtname_ft[0]', c.county ? { value: c.county, source: c.countySource } : undefined, 'Court county');
  set('CrtStreetAdd_ft[0]', c.street ? { value: c.street, source: c.source } : undefined, 'Court street address');
  set('CrtMail_ft[0]', c.mailing ? { value: c.mailing, source: c.source } : undefined, 'Court mailing address');
  set('CrtCityZip_ft[0]', c.cityZip ? { value: c.cityZip, source: c.source } : undefined, 'Court city and ZIP');
  set('CrtBranch[0]', c.branch ? { value: c.branch, source: c.source } : undefined, 'Court branch');
  caption(f, F);
  const kind = partnerKind(F, ID);
  f.check(`${P}P1Header_sf[0].Title_sf[0].#area[0].CheckBox21[0]`, kind ? kind.value === 'spouse' : undefined, { item: 'Title', label: 'Spousal', source: kind && kind.source, need: 'family.spouseSurvived' });
  f.check(`${P}P1Header_sf[0].Title_sf[0].#area[0].CheckBox21[1]`, kind ? kind.value === 'rdp' : undefined, { item: 'Title', label: 'Domestic partner', source: kind && kind.source });
  const hd = F.get('hearing.date', ID);
  f.text(`${P}FillText103[0]`, hd ? { value: fmtDate(hd), source: F.src('hearing.date') } : undefined, { item: '1', label: 'Date of hearing', need: 'hearing.date' });
  f.text(`${P}FillText102[0]`, F.v('hearing.time', ID), { item: '1', label: 'Time', need: 'hearing.time' });
  f.text(`${P}FillText100[0]`, F.v('hearing.dept', ID), { item: '1', label: 'Dept.', need: 'hearing.dept' });
  f.text(`${P}FillText101[0]`, F.opt('hearing.room') ? F.v('hearing.room') : undefined, { item: '1', label: 'Room', blankReason: 'No room in file' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${P}FillText99[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '3', label: 'Decedent died on', need: 'decedent.dateOfDeath' });
  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty'); const crt = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crt && resCounty.toLowerCase() === crt.toLowerCase();
  f.check(`${P}CheckBox17[0]`, caRes === undefined ? undefined : !!inCounty, { item: '3a', label: 'resident of the county', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')}`, need: 'decedent.caResident' });
  f.check(`${P}CheckBox17[1]`, caRes === undefined ? undefined : caRes === false, { item: '3b', label: 'nonresident', source: F.src('decedent.caResident') });
  const will = F.get('will.exists', ID);
  f.check(`${P}CheckBox18[0]`, will === undefined ? undefined : will === false, { item: '3c', label: 'intestate', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P}CheckBox18[1]`, will, { item: '3c', label: 'testate', source: F.src('will.exists') });
  f.check(`${P}CheckBox14[0]`, kind ? kind.value === 'spouse' : undefined, { item: '4', label: 'surviving spouse', source: kind && kind.source });
  f.check(`${P}CheckBox14[1]`, kind ? kind.value === 'rdp' : undefined, { item: '4', label: 'surviving registered domestic partner', source: kind && kind.source });
  // survivor's name: the petitioner when the petitioner is the survivor; otherwise asked
  const rel = String(F.opt('petitioner.relationship') || '').toLowerCase();
  const surv = /spouse|wife|husband|domestic partner/.test(rel) ? F.v('petitioner.name', ID) : F.v('spousal.survivorName', ID, { label: 'Name of the surviving spouse or partner', type: 'text' });
  f.text(`${P}FillText98[0]`, surv ? { value: surv.value, source: /spouse|wife|husband|domestic partner/.test(rel) ? `${surv.source} (petitioner is the ${rel})` : surv.source } : undefined, { item: '4', label: 'Surviving spouse or partner (name)', need: 'spousal.survivorName' });
  const passing = F.get('spousal.passing', ID, { label: 'Request a determination of property passing to the surviving spouse or partner without administration (Prob. Code 13500)?', type: 'yesno' });
  const confirm = F.get('spousal.confirmation', ID, { label: 'Request confirmation of property belonging to the surviving spouse or partner (Prob. Code 100, 101)?', type: 'yesno' });
  f.check(`${P}CheckBox11[0]`, passing, { item: '5a', label: 'Property in Attachment 5a passes to survivor', source: F.src('spousal.passing'), need: 'spousal.passing' });
  f.check(`${P}CheckBox10[0]`, false, { item: '5b', label: 'Further orders in Attachment 5b', source: 'none requested' });
  f.check(`${P}CheckBox9[0]`, false, { item: '6', label: 'Business creditors protected', source: 'no business in the petition (Prob. Code 13658)' });
  f.text(`${P}FillText97[0]`, undefined, { item: '6', label: 'Business name', blankReason: 'No business' });
  f.check(`${P}CheckBox7[0]`, false, { item: '6a', label: 'Undertaking', source: 'no business' });
  f.text(`${P}FillText96[0]`, undefined, { item: '6a', blankReason: 'No business' });
  f.text(`${P}FillText95[0]`, undefined, { item: '6a', blankReason: 'No business' });
  f.check(`${P}CheckBox8[0]`, false, { item: '6b', label: 'Further orders in Attachment 6b', source: 'no business' });
  f.check(`${P}CheckBox6[0]`, confirm, { item: '7a', label: 'Property in Attachment 7a confirmed to survivor', source: F.src('spousal.confirmation'), need: 'spousal.confirmation' });
  f.check(`${P}CheckBox5[0]`, false, { item: '7b', label: 'Further orders in Attachment 7b', source: 'none requested' });
  const pp = F.opt('spousal.probatePetitionStatus');
  f.check(`${P}CheckBox4[0]`, pp ? pp !== 'not filed' : undefined, { item: '8', label: 'Other property subject to administration', source: F.src('spousal.probatePetitionStatus'), need: 'spousal.probatePetitionStatus' });
  if (!pp) F.need('spousal.probatePetitionStatus', ID, { label: 'A petition for probate or administration: is being filed with this petition, was filed (give date), or has not been and is not being filed?', type: 'choice', options: ['being filed', 'was filed', 'not filed'] });
  f.check(`${P}CheckBox1[0]`, false, { item: '8', label: 'All such property described in Attachment 8', source: 'not requested' });
  f.check(`${P}CheckBox3[0]`, false, { item: '9', label: 'Other', source: 'none requested' });
  f.text(`${P}FillText141[0]`, undefined, { item: '9', blankReason: 'No other orders' });
  f.check(`${P}CheckBox2[0]`, false, { item: '9', label: 'Continued in Attachment 9', source: 'none' });
  const nAtt = (passing ? 1 : 0) + (confirm ? 1 : 0);
  f.text(`${P}FillText140[0]`, nAtt ? { value: String(nAtt), source: 'Attachments 5a/7a generated' } : undefined, { item: '10', label: 'Number of pages attached', blankReason: 'No attachments' });
  f.text(`${P}T206[0]`, undefined, { item: 'Judicial officer', label: 'Date', blankReason: 'Dated by the judicial officer' });
  f.check(`${P}CheckBox19[0]`, nAtt > 0, { item: 'Judicial officer', label: 'Signature follows last attachment', source: nAtt ? 'attachments generated' : 'no attachments' });
  ctx.att = {
    a5a: passing ? F.get('spousal.attachment7a', ID, { label: "Attachment 7a: legal description (and APN for real property) of the decedent's property passing to the survivor", type: 'text' }) : undefined,
    a7a: confirm ? F.get('spousal.attachment7b', ID, { label: 'Attachment 7b: legal description (and APN for real property) of the community or quasi-community property belonging to the survivor', type: 'text' }) : undefined,
    passing, confirm,
  };
}

async function after(doc, F, ctx) {
  const estate = (F.opt('decedent.name') || ''); const caseNumber = F.opt('case.number') || '';
  const a = ctx.att || {}; const cols = [{ title: '', width: 540 }];
  if (a.passing) await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 5a', intro: 'Property passing to the surviving spouse or surviving registered domestic partner; no administration of it is necessary.', columns: cols, rows: [[a.a5a || '[ANSWER NEEDED: property description]']] });
  if (a.confirm) await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 7a', intro: 'Property that belonged to the surviving spouse or surviving registered domestic partner (Fam. Code 297.5; Prob. Code 100, 101), confirmed to the survivor.', columns: cols, rows: [[a.a7a || '[ANSWER NEEDED: property description]']] });
}

module.exports = {
  id: ID, kind: 'jc', title: 'Spousal or Domestic Partner Property Order', revision: 'Rev. January 1, 2015', template: 'DE-226.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de226.pdf', procedures: ['13650'], fill, after,
};
