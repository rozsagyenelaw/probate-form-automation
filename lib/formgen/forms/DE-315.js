// DE-315 Order Determining Succession to Primary Residence (Rev. April 28, 2025). Prob. Code 13154.
// A proposed order: the judicial officer signs and dates it. Findings mirror the DE-310 facts.
const { header, caption, petitionerFor } = require('../header');
const { courtFor } = require('../courts');
const { heirs } = require('../people');
const { fmtDate } = require('../format');
const { appendTableAttachment } = require('../attach');
const { limitFor, residenceParcel, parcelAddress } = require('../smallestate');

const ID = 'DE-315';
const P = 'DE-315[0].Page1[0].';

function courtBlockCrtInfo(f, F, prefix) {
  const c = courtFor(F, ID);
  const set = (n, v, label) => f.text(`${prefix}${n}`, v, { item: 'Caption', label, need: c.need || 'court.county' });
  set('Crtname[0]', c.county ? { value: c.county.toUpperCase(), source: c.countySource } : undefined, 'Court county');
  set('CrtStreetAdd[0]', c.street ? { value: c.street, source: c.source } : undefined, 'Court street address');
  set('CrtMail[0]', c.mailing ? { value: c.mailing, source: c.source } : undefined, 'Court mailing address');
  set('CrtCityZip[0]', c.cityZip ? { value: c.cityZip, source: c.source } : undefined, 'Court city and ZIP');
  set('CrtBranch[0]', c.branch ? { value: c.branch, source: c.source } : undefined, 'Court branch');
}

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  courtBlockCrtInfo(f, F, `${P}P1Caption[0].CrtInfo[0].`);
  caption(f, F);
  const L1 = `${P}List1[0].LI1[0].`;
  const hd = F.get('hearing.date', ID);
  f.text(`${L1}HearingDate[0]`, hd ? { value: fmtDate(hd), source: F.src('hearing.date') } : undefined, { item: '1', label: 'Date of hearing', need: 'hearing.date' });
  f.text(`${L1}HearingTime[0]`, F.v('hearing.time', ID), { item: '1', label: 'Time', need: 'hearing.time' });
  const dept = F.get('hearing.dept', ID); const room = F.opt('hearing.room');
  f.text(`${L1}HearingDept[0]`, dept ? { value: room ? `${dept}/${room}` : dept, source: F.src('hearing.dept') } : undefined, { item: '1', label: 'Department/Room', need: 'hearing.dept' });
  f.text(`${L1}HearingOfcr[0]`, F.opt('hearing.judge') ? F.v('hearing.judge') : undefined, { item: '1', label: 'Judicial officer', blankReason: 'Judicial officer not in file' });

  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${P}List3[0].DateofDeath[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '3', label: 'Decedent died on', need: 'decedent.dateOfDeath' });
  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty'); const crt = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crt && resCounty.toLowerCase() === crt.toLowerCase();
  f.check(`${P}List3[0].lia[0].Resident[0]`, caRes === undefined ? undefined : !!inCounty, { item: '3a', label: 'resident of this county', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')}`, need: 'decedent.caResident' });
  f.check(`${P}List3[0].lib[0].Resident[0]`, caRes === undefined ? undefined : caRes === false, { item: '3b', label: 'nonresident owning property in this county', source: F.src('decedent.caResident') });
  const will = F.get('will.exists', ID);
  f.check(`${P}List3[0].lic[0].Intestate[0]`, will === undefined ? undefined : will === false, { item: '3c', label: 'intestate', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P}List3[0].lic[0].Intestate[1]`, will, { item: '3c', label: 'testate', source: F.src('will.exists') });
  const admin = F.get('estate.caAdministration', ID, { label: 'Has any proceeding for administration of the estate been conducted, or is one being conducted, in California?', type: 'yesno' });
  f.check(`${P}LI5[0].lia[0].Proceeding[0]`, admin === undefined ? undefined : admin === false, { item: '5a', label: 'No administration in California', source: F.src('estate.caAdministration'), need: 'estate.caAdministration' });
  f.check(`${P}LI5[0].lib[0].Proceeding[0]`, admin === undefined ? undefined : admin === true, { item: '5b', label: 'PR consented in writing', source: F.src('estate.caAdministration') });
  const lim = limitFor(13151, F, ID);
  ['a', 'b', 'c'].forEach((box, i) => f.check(`${P}List6[0].LI6[0].Value[${i}]`, lim ? lim.box === box : undefined, { item: '6', label: 'Gross value does not exceed', source: lim ? lim.source : '', need: 'decedent.dateOfDeath' }));
  f.check(`${P}LI7[0].lia[0].Will[0]`, will, { item: '7a', label: '(will) beneficiary', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P}LI7[0].lib[0].Will[0]`, will === undefined ? undefined : will === false, { item: '7b', label: '(no will) heir', source: F.src('will.exists') });

  // 9a property: legal description with APN
  const parcel = residenceParcel(F, ID);
  const legal = F.get('property.legalDescription', ID, { label: 'Legal description of the residence, copied exactly from the deed', type: 'text' });
  const apn = parcel && parcel.p.apn ? { value: parcel.p.apn, source: `case.assets.realProperty[${parcel.i}].apn` } : F.v('property.apn', ID, { label: "Assessor's Parcel Number of the residence", type: 'text' });
  const desc = legal && apn ? `${legal}\nAPN: ${apn.value}${parcel ? `\nCommonly known as: ${parcelAddress(parcel.p)}` : ''}` : undefined;
  const fitsBelow = desc && desc.length <= 330;
  f.check(`${P}Item9[0].Item9a[0].DescAtt[0]`, desc ? !fitsBelow : undefined, { item: '9a', label: 'described in Attachment 9a', source: 'length of legal description' });
  f.check(`${P}Item9[0].Item9a[0].DescAtt[1]`, desc ? !!fitsBelow : undefined, { item: '9a', label: 'described below', source: 'length of legal description' });
  f.text(`${P}Item9[0].Item9a[0].Field9a[0]`, fitsBelow ? { value: desc, source: `${F.src('property.legalDescription')}; ${apn.source}` } : undefined, { item: '9a', label: 'Legal description and APN', need: !legal ? 'property.legalDescription' : (!apn ? 'property.apn' : undefined), blankReason: desc ? 'See Attachment 9a' : '' });
  if (desc && !fitsBelow) ctx.att9a = desc;

  // 9b each petitioner's interest
  const hs = heirs(F, ID);
  const pname = (F.opt('petitioner.name') || '').toLowerCase();
  const me = hs.find((h) => h.name.toLowerCase() === pname);
  let interest = F.opt('succession.petitionerInterest'); let src = F.src('succession.petitionerInterest');
  if (!interest && me && me.share) { interest = `${me.name}: an undivided ${me.share}% interest`; src = `case.heirs[${me.index}].sharePercentage`; }
  if (!interest) F.need('succession.petitionerInterest', ID, { label: 'Interest of each petitioner in the residence (DE-310 item 13)', type: 'text' });
  f.check(`${P}Item9[0].lib[0].BelAtt9b[0]`, false, { item: '9b', label: 'stated in Attachment 9b', source: 'stated in item 9b' });
  f.check(`${P}Item9[0].lib[0].BelAtt9b[1]`, interest ? true : undefined, { item: '9b', label: 'is as follows', source: src });
  f.text(`${P}Item9[0].lib[0].Field9b[0]`, interest ? { value: interest, source: src } : undefined, { item: '9b', label: "Each petitioner's name and interest", need: 'succession.petitionerInterest' });
  f.check(`${P}List10[0].LI10[0].OtherOrders_cb[0]`, false, { item: '10', label: 'Other orders in Attachment 10', source: 'none requested' });
  f.text(`${P}List11[0].LI11[0].Pages[0]`, ctx.att9a ? { value: '1', source: 'Attachment 9a generated' } : undefined, { item: '11', label: 'Number of pages attached', blankReason: 'No attachments' });
  f.text(`${P}JOSigBlock[0].Date[0]`, undefined, { item: 'Judicial officer', label: 'Date', blankReason: 'Dated by the judicial officer' });
  f.check(`${P}JOSigBlock[0].Sig_cb[0]`, !!ctx.att9a, { item: 'Judicial officer', label: 'Signature follows last attachment', source: ctx.att9a ? 'Attachment 9a generated' : 'No attachments' });
}

async function after(doc, F, ctx) {
  if (!ctx.att9a) return;
  await appendTableAttachment(doc, { estate: (F.opt('decedent.name') || '').toUpperCase(), caseNumber: F.opt('case.number') || '', formId: ID, title: 'ATTACHMENT 9a', intro: 'Legal description of the real property, including the Assessor\'s Parcel Number.', columns: [{ title: '', width: 540 }], rows: [[ctx.att9a]] });
}

module.exports = {
  id: ID, kind: 'jc', title: 'Order Determining Succession to Primary Residence', revision: 'Rev. April 28, 2025', template: 'DE-315.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de315.pdf', procedures: ['13151'], fill, after,
};
