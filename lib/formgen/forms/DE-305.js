// DE-305 Affidavit re Real Property of Small Value (Rev. January 1, 2026). Prob. Code 13200.
// Set: DE-305 signed by every declarant before a notary; certified death certificate; DE-160/DE-161
// inventory and appraisal of all California real property by a probate referee (13200(c));
// DE-300 (death on or after 4/1/2022); will copy if claiming under a will; Attachment 5a (legal
// description and APN). LASC Local Rule 4.45: attach a statement that the decedent died testate
// with an executed copy of the will, or (intestate) a statement of the heirs' relationship.
const { header, caption, petitionerFor } = require('../header');
const { fmtDate, money, num, isoDate } = require('../format');
const { appendTableAttachment } = require('../attach');
const { limitFor, daysBetween, residenceParcel, parcelAddress, successors } = require('../smallestate');
const { addMonths } = require('../format');

const ID = 'DE-305';
const P1 = 'DE-305[0].Page1[0].';
const P2 = 'DE-305[0].Page2[0].';

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: (() => { const s = successors(F, ID); return s.length ? { value: `Declarant${s.length > 1 ? 's' : ''} ${s.map((x) => x.name).join(', ')}`, source: 'case.heirs[] with a share' } : petitionerFor(F, ID); })() });
  caption(f, F);
  const L1 = `${P1}List1[0].LI1[0].`;
  const dn = F.v('decedent.name', ID);
  f.text(`${L1}DecedentName[0]`, dn ? { value: dn.value.toUpperCase(), source: dn.source } : undefined, { item: '1', label: 'Decedent', need: 'decedent.name' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${L1}DeathDate[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '1', label: 'Date of death', need: 'decedent.dateOfDeath' });
  f.text(`${L1}DeathCityState[0]`, F.v('decedent.placeOfDeath', ID), { item: '1', label: 'Place of death (city, state)', need: 'decedent.placeOfDeath' });
  if (dod && isoDate(ctx.now) < addMonths(isoDate(dod), 6)) ctx.warnings.push(`Item 2: six months have not passed since the death (earliest filing ${fmtDate(addMonths(isoDate(dod), 6))}; Prob. Code 13200(a)).`);
  ctx.warnings.push('Item 2: attach a certified copy of the death certificate.');

  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty'); const crt = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crt && resCounty.toLowerCase() === crt.toLowerCase();
  f.check(`${P1}List3[0].lia[0].domicile[0]`, caRes === undefined ? undefined : !!inCounty, { item: '3a', label: 'Domiciled in this county', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')}`, need: 'decedent.caResident' });
  f.check(`${P1}List3[0].lib[0].domicile[0]`, caRes === undefined ? undefined : caRes === false, { item: '3b', label: 'Not domiciled in California; owned real property here', source: F.src('decedent.caResident') });

  const lim = limitFor(13200, F, ID);
  [['a', 'PropValueOld[0].Value[0]'], ['b', 'PropValue2022[0].Value[0]'], ['c', 'PropValue2025[0].Value[0]']].forEach(([box, n]) => f.check(`${P1}List4[0].${n}`, lim ? lim.box === box : undefined, { item: `4${box}`, label: 'Gross value of California real property did not exceed', source: lim ? lim.source : '', need: 'decedent.dateOfDeath' }));
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  const total = rp.reduce((s, p) => s + num(p.estimatedValue), 0);
  if (lim && total > lim.amount) ctx.warnings.push(`Item 4: the California real property in the file is estimated at $${money(total)}, above the $${money(lim.amount)} limit. The referee's appraisal (item 7) controls; if it is also above the limit, DE-305 is not available.`);
  ctx.warnings.push(`Item 7: attach the Inventory and Appraisal (DE-160/DE-161) of all the decedent's California real property, appraised by a probate referee${lim && lim.de300 ? '; item 4: attach form DE-300' : ''}.`);

  // 5 property
  const parcel = residenceParcel(F, ID);
  const legal = F.get('property.legalDescription', ID, { label: 'Legal description of the parcel, copied exactly from the deed', type: 'text' });
  const apn = parcel && parcel.p.apn ? { value: parcel.p.apn, source: `case.assets.realProperty[${parcel.i}].apn` } : F.v('property.apn', ID, { label: "Assessor's Parcel Number of the parcel", type: 'text' });
  ctx.att5a = [
    ['Address', parcel ? parcelAddress(parcel.p) : '[ANSWER NEEDED: property]'],
    ['Legal description', legal || '[ANSWER NEEDED: legal description]'],
    ["Assessor's Parcel Number", apn ? apn.value : '[ANSWER NEEDED: APN]'],
  ];
  const interest = F.v('property.decedentInterest', ID, { label: "Decedent's interest in the parcel (for example: 100% fee simple)", type: 'text' });
  f.text(`${P1}List5[0].lib[0].DecPropIntrst_tf[0]`, interest, { item: '5b', label: "Decedent's interest in the property", need: 'property.decedentInterest' });

  // 6 guardians / conservators
  const gc = F.get('decedent.underConservatorship', ID, { label: "Was the decedent's estate under a guardianship or conservatorship at death? (no, guardianship, conservatorship)", type: 'choice', options: ['no', 'guardianship', 'conservatorship'] });
  f.check(`${P1}List6[0].LI6[0].GCNo[0].GC[0]`, gc === undefined ? undefined : gc === 'no', { item: '6', label: 'none', source: F.src('decedent.underConservatorship'), need: 'decedent.underConservatorship' });
  f.check(`${P1}List6[0].LI6[0].GCYes[0].GC[0]`, gc === undefined ? undefined : gc !== 'no', { item: '6', label: 'are as follows', source: F.src('decedent.underConservatorship') });
  const gcName = gc && gc !== 'no' ? F.v('decedent.guardianConservatorName', ID, { label: 'Name of the guardian or conservator at death', type: 'text' }) : undefined;
  const gcAddr = gc && gc !== 'no' ? F.v('decedent.guardianConservatorAddress', ID, { label: 'Address of the guardian or conservator at death', type: 'text' }) : undefined;
  f.text(`${P1}List6[0].LI6[0].GCName1[0]`, gcName, { item: '6', label: 'Guardian/conservator name', blankReason: 'None' });
  f.text(`${P1}List6[0].LI6[0].GCAddr1[0]`, gcAddr, { item: '6', label: 'Guardian/conservator address', blankReason: 'None' });
  f.text(`${P1}List6[0].LI6[0].GCName2[0]`, undefined, { item: '6', blankReason: 'None' });
  f.text(`${P1}List6[0].LI6[0].GCAddr2[0]`, undefined, { item: '6', blankReason: 'None' });
  f.check(`${P1}List6[0].LI6[0].GCAddlAtt_cb[0]`, false, { item: '6', label: 'Additional in Attachment 6', source: 'none' });
  if (gc && gc !== 'no') ctx.warnings.push('Item 6: deliver a copy of the affidavit and all attachments to each guardian or conservator (Prob. Code 1215) and keep the proof (POS-030, POS-020 or POS-050).');

  // 8 administration
  const admin = F.get('estate.caAdministration', ID, { label: 'Has any proceeding for administration of the estate been conducted, or is one being conducted, in California?', type: 'yesno' });
  f.check(`${P1}Item8[0].lia[0].AdminYN[0]`, admin === undefined ? undefined : admin === false, { item: '8a', label: 'No administration in California', source: F.src('estate.caAdministration'), need: 'estate.caAdministration' });
  f.check(`${P1}Item8[0].lib[0].AdminYN[0]`, admin === undefined ? undefined : admin === true, { item: '8b', label: 'PR consented (consent and letters attached)', source: F.src('estate.caAdministration') });

  // 10 successor basis
  const will = F.get('will.exists', ID);
  f.check(`${P2}Item10[0].Sub10a[0].WillYN[0]`, will, { item: '10a', label: '(will) beneficiaries; will attached', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P2}Item10[0].Sub10b[0].WillYN[0]`, will === undefined ? undefined : will === false, { item: '10b', label: '(no will) heirs under 6401, 6402', source: F.src('will.exists') });
  ctx.warnings.push('Item 9: every declarant swears funeral expenses, last-illness expenses and all known unsecured debts have been paid. Confirm before signing.');

  // declarants: the successors in the file (living heirs with a share)
  const decl = successors(F, ID);
  if (!decl.length) F.need('smallEstate.successors', ID, { label: 'Declarants: name of each successor to the property (no heir in the file has a share)', type: 'text' });
  f.text(`${P2}Signsub[0].DateSig1[0]`, undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated when signed before the notary' });
  f.text(`${P2}Signsub[0].SignatureName1[0]`, decl[0] ? { value: decl[0].name.toUpperCase(), source: `${decl[0].nameSource} (share ${decl[0].share}%)` } : undefined, { item: 'Signature', label: 'Declarant 1', need: 'smallEstate.successors' });
  f.text(`${P2}Signsub[0].DateSig2[0]`, undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated when signed before the notary' });
  f.text(`${P2}Signsub[0].SignatureName2[0]`, decl[1] ? { value: decl[1].name.toUpperCase(), source: `${decl[1].nameSource} (share ${decl[1].share}%)` } : undefined, { item: 'Signature', label: 'Declarant 2', blankReason: 'One declarant' });
  f.check(`${P2}Signsub[0].AddlDecl_cb[0]`, decl.length > 2, { item: 'Signature', label: 'Signatures of additional declarants attached', source: `${decl.length} successors in case.heirs` });
  if (decl.length > 2) ctx.warnings.push(`More than two declarants (${decl.map((d) => d.name).join(', ')}): attach their signature pages and acknowledgments.`);
  // notary certificate and clerk's certificate are completed by the notary and the clerk
  for (const n of ['CrtofAcknwldgmt[0].County[0]', 'CrtofAcknwldgmt[0].Notary\\.date[0]', 'CrtofAcknwldgmt[0].notary\\.name\\.title[0]', 'CrtofAcknwldgmt[0].appear\\.names[0]']) f.text(`${P2}${n}`, undefined, { item: 'Acknowledgment', blankReason: 'Completed by the notary' });
  for (const n of ['ClerkCert[0].Clerk\\.certificate\\.date[0]', 'ClerkCert[0].ClerkBy[0]']) f.text(`${P2}${n}`, undefined, { item: "Clerk's certificate", blankReason: 'Completed by the clerk' });

  // LASC Local Rule 4.45 statement
  const county = String(F.opt('court.county') || '').toLowerCase();
  if (county === 'los angeles') {
    if (will === true) ctx.rule445 = { title: 'STATEMENT UNDER LASC LOCAL RULE 4.45(a)', rows: [['The decedent died testate. An executed copy of the decedent\'s will is attached.']] };
    else if (will === false) ctx.rule445 = { title: 'STATEMENT UNDER LASC LOCAL RULE 4.45(b)', intro: 'The decedent died intestate. The relationship of each heir to the decedent, which establishes the declarants\' claim to entitlement, is:', cols: true, rows: (decl.length ? decl : []).map((h) => [h.name, h.relationship, h.share ? `${h.share}%` : '']) };
    if (will === true) ctx.warnings.push('LASC Local Rule 4.45(a): attach an executed copy of the will behind the statement.');
  }
}

async function after(doc, F, ctx) {
  const estate = (F.opt('decedent.name') || '').toUpperCase(); const caseNumber = F.opt('case.number') || '';
  await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 5a', intro: 'Legal description and Assessor\'s Parcel Number of the real property claimed by the declarant(s), copied exactly from the deed.', columns: [{ title: 'Item', width: 150 }, { title: 'Description', width: 390 }], rows: ctx.att5a || [] });
  if (ctx.rule445) {
    const r = ctx.rule445;
    await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: r.title, intro: r.intro, columns: r.cols ? [{ title: 'Heir', width: 220 }, { title: 'Relationship', width: 200 }, { title: 'Share', width: 120 }] : [{ title: '', width: 540 }], rows: r.rows });
  }
}

module.exports = {
  id: ID, kind: 'jc', title: 'Affidavit re Real Property of Small Value', revision: 'Rev. January 1, 2026', template: 'DE-305.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de305.pdf', procedures: ['13200'], fill, after,
};
