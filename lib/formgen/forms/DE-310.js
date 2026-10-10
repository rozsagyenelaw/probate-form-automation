// DE-310 Petition to Determine Succession to Primary Residence (Rev. April 28, 2025).
// Prob. Code 13150 to 13157 (as amended by AB 2016). Required set: DE-310 with Attachment 8
// (DE-160/DE-161 appraisal by a probate referee the petitioner selects), DE-300 (death on or
// after 4/1/2022), will copy (Attachment 5 or 12a), PR consent (6b), Attachments 11 and 14;
// notice of hearing on DE-120 (13153, 1220); order DE-315 (13154).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { fmtDate, money, num, isoDate } = require('../format');
const { appendTableAttachment } = require('../attach');
const { oneLineAddress } = require('../facts');
const { limitFor, daysBetween, survivors, residenceParcel, parcelAddress } = require('../smallestate');

const ID = 'DE-310';
const P1 = 'DE-310[0].Page1[0].';
const P2 = 'DE-310[0].Page2[0].';

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const hd = F.opt('hearing.date');
  f.text(`${P1}P1Caption[0].HrgDateTime[0].HearingDtTm[0]`, hd ? { value: `${fmtDate(hd)}${F.opt('hearing.time') ? ` ${F.opt('hearing.time')}` : ''}`, source: F.src('hearing.date') } : undefined, { item: 'Caption', label: 'Hearing date and time', blankReason: 'Set by the clerk at filing' });
  f.text(`${P1}P1Caption[0].HrgDept[0].Dept[0]`, F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: 'Caption', label: 'Department', blankReason: 'Set by the clerk at filing' });

  // 1, 2
  const pn = F.v('petitioner.name', ID);
  f.text(`${P1}List1[0].LI1[0].PtnrNames_ft[0]`, pn, { item: '1', label: 'Petitioner (each person claiming an interest)', need: 'petitioner.name' });
  ctx.warnings.push('Item 1: every person claiming an interest in the residence must be a petitioner and sign (the order covers only the interests of the petitioners, Prob. Code 13154). Only one petitioner is in the file.');
  const dn = F.v('decedent.name', ID);
  f.text(`${P1}List2[0].Party1[0]`, dn ? { value: dn.value, source: dn.source } : undefined, { item: '2', label: 'Decedent', need: 'decedent.name' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${P1}List2[0].lia[0].Decedent\\.DOD[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '2a', label: 'Date of death', need: 'decedent.dateOfDeath' });
  f.text(`${P1}List2[0].lib[0].Decedent\\.place[0]`, F.v('decedent.placeOfDeath', ID), { item: '2b', label: 'Place of death', need: 'decedent.placeOfDeath' });
  if (dod) {
    const days = daysBetween(isoDate(dod), isoDate(ctx.now));
    if (days < 40) ctx.warnings.push(`Item 3: only ${days} days have passed since the death; the petition may not be filed until 40 days have passed (Prob. Code 13151).`);
  }

  // 4 residence
  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty'); const crt = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crt && resCounty.toLowerCase() === crt.toLowerCase();
  f.check(`${P1}LI4[0].lia[0].ResYN[0]`, caRes === undefined ? undefined : !!inCounty, { item: '4a', label: 'Resident of this county', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')}`, need: 'decedent.caResident' });
  f.check(`${P1}LI4[0].ib[0].ResYN[0]`, caRes === undefined ? undefined : caRes === false, { item: '4b', label: 'Nonresident of California owning property in this county', source: F.src('decedent.caResident') });

  // 5 will
  const will = F.get('will.exists', ID);
  f.check(`${P1}List5[0].LI5[0].WillYN[0]`, will === undefined ? undefined : will === false, { item: '5', label: 'intestate', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P1}List5[0].LI5[0].WillYN[1]`, will, { item: '5', label: 'testate (copy of will attached)', source: F.src('will.exists') });
  if (will) ctx.warnings.push('Attachment 5 or 12a: attach a copy of the will and any codicil.');

  // 6 administration in California
  const admin = F.get('estate.caAdministration', ID, { label: 'Has any proceeding for administration of the estate been conducted, or is one being conducted, in California?', type: 'yesno' });
  f.check(`${P1}LI6[0].lia[0].ProcYN[0]`, admin === undefined ? undefined : admin === false, { item: '6a', label: 'No administration in California', source: F.src('estate.caAdministration'), need: 'estate.caAdministration' });
  f.check(`${P1}LI6[0].ib[0].ProcYN[0]`, admin === undefined ? undefined : admin === true, { item: '6b', label: 'PR consent attached (Attachment 6b)', source: F.src('estate.caAdministration') });
  if (admin === true) ctx.warnings.push('Attachment 6b: attach the personal representative\'s written consent (Prob. Code 13152(d)).');

  // 7 other jurisdictions
  const other = F.get('estate.otherJurisdiction', ID, { label: 'Administration of the estate in another state or country: not commenced, commenced, or commenced and completed?', type: 'choice', options: ['not commenced', 'commenced', 'commenced and completed'] });
  f.check(`${P1}LI7[0].lia[0].OOSYN[0]`, other === undefined ? undefined : other === 'not commenced', { item: '7a', label: 'have not been commenced', source: F.src('estate.otherJurisdiction'), need: 'estate.otherJurisdiction' });
  f.check(`${P1}LI7[0].lib[0].OOSYN[0]`, other === undefined ? undefined : other !== 'not commenced', { item: '7b', label: 'have been commenced', source: F.src('estate.otherJurisdiction') });
  f.check(`${P1}LI7[0].lib[0].Complete[0].OOSComplete[0]`, other === undefined ? undefined : other === 'commenced and completed', { item: '7b', label: 'and completed', source: F.src('estate.otherJurisdiction') });
  f.text(`${P1}LI7[0].lib[0].Field7b[0]`, other && other !== 'not commenced' ? F.v('estate.otherJurisdictionDetails', ID, { label: 'Other proceeding: state, county, court and case number', type: 'text' }) : undefined, { item: '7b', label: 'State, county, court, case number', blankReason: 'No other proceeding', need: other && other !== 'not commenced' ? 'estate.otherJurisdictionDetails' : undefined });

  // 8 value limit by date of death
  const lim = limitFor(13151, F, ID);
  for (const [box, n] of [['a', 'lia[0].GrossValue[0]'], ['b', 'lib[0].GrossValue[0]'], ['c', 'lic[0].GrossValue[0]']]) {
    f.check(`${P1}LI8[0].${n}`, lim ? lim.box === box : undefined, { item: `8${box}`, label: 'Gross value did not exceed', source: lim ? lim.source : '', need: 'decedent.dateOfDeath' });
  }
  const parcel = residenceParcel(F, ID);
  if (lim && parcel && parcel.p.estimatedValue !== undefined && num(parcel.p.estimatedValue) > lim.amount) {
    ctx.warnings.push(`Item 8: the estimated value in the file ($${money(parcel.p.estimatedValue)}) is above the $${money(lim.amount)} limit for this date of death. The referee's appraisal (Attachment 8) controls; if it is also above the limit this procedure is not available.`);
  }
  ctx.warnings.push(`Attachment 8: Inventory and Appraisal on DE-160/DE-161 by a probate referee appointed for the county${lim && lim.de300 ? ', plus form DE-300' : ''} (Prob. Code 13152(b), (e)).`);

  // 9 survivors
  const s = survivors(F, ID);
  const L9 = `${P1}LI9[0].lia[0].LIST1[0].`;
  f.check(`${L9}li1[0].Spouse[0]`, s.spouse, { item: '9a(1)', label: 'spouse', source: s.spouseSrc, need: 'family.spouseSurvived' });
  f.check(`${L9}li2[0].Spouse[0]`, s.spouse === undefined ? undefined : s.spouse === false, { item: '9a(2)', label: 'no spouse', source: s.spouseSrc });
  f.check(`${L9}li2[0].LIST2[0].lia[0].NoSpouse[0]`, s.spouse === false ? (s.noSpouseReason === undefined ? undefined : s.noSpouseReason === 'divorced or never married') : false, { item: '9a(2)(a)', label: 'divorced or never married', source: s.spouse === false ? s.noSpouseSrc : 'spouse survived or unknown', need: s.spouse === false ? 'family.noSpouseReason' : undefined });
  f.check(`${L9}li2[0].LIST2[0].lib[0].NoSpouse[0]`, s.spouse === false ? (s.noSpouseReason === undefined ? undefined : s.noSpouseReason === 'spouse deceased') : false, { item: '9a(2)(b)', label: 'spouse deceased', source: s.spouse === false ? s.noSpouseSrc : 'spouse survived or unknown' });
  f.check(`${L9}li3[0].RDP[0]`, s.rdp, { item: '9a(3)', label: 'registered domestic partner', source: s.rdpSrc, need: 'family.rdpSurvived' });
  f.check(`${L9}li4[0].RDP[0]`, s.rdp === undefined ? undefined : s.rdp === false, { item: '9a(4)', label: 'no registered domestic partner', source: s.rdpSrc });
  f.check(`${L9}li5[0].Child[0]`, s.child, { item: '9a(5)', label: 'child', source: s.childSrc, need: 'family.childSurvived' });
  f.check(`${L9}li5[0].LIST3[0].lia[0].ChildNat[0]`, s.child === true ? (s.childType === undefined ? undefined : s.childType !== 'natural adopted by a third party') : false, { item: '9a(5)(a)', label: 'natural or adopted', source: s.child === true ? s.childTypeSrc : 'no child or unknown', need: s.child === true ? 'family.childType' : undefined });
  f.check(`${L9}li5[0].LIST3[0].lib[0].ChildNat[0]`, s.child === true ? (s.childType === undefined ? undefined : s.childType !== 'natural or adopted') : false, { item: '9a(5)(b)', label: 'natural, adopted by a third party', source: s.child === true ? s.childTypeSrc : 'no child or unknown' });
  f.check(`${L9}li6[0].Child[0]`, s.child === undefined ? undefined : s.child === false, { item: '9a(6)', label: 'no child', source: s.childSrc });
  f.check(`${L9}li7[0].Issue[0]`, s.ipc, { item: '9a(7)', label: 'issue of a predeceased child', source: s.ipcSrc, need: 'family.issueOfPredeceasedChild' });
  f.check(`${L9}li8[0].Issue[0]`, s.ipc === undefined ? undefined : s.ipc === false, { item: '9a(8)', label: 'no issue of a predeceased child', source: s.ipcSrc });
  f.check(`${P1}LI9[0].Item9b[0].StepYN[0]`, s.step, { item: '9b', label: 'is survived by stepchild/foster child', source: s.stepSrc, need: 'family.stepchild' });
  f.check(`${P1}LI9[0].Item9b[0].StepYN[1]`, s.step === undefined ? undefined : s.step === false, { item: '9b', label: 'is not', source: s.stepSrc });

  // 10 (only when no issue survived)
  const i10 = s.noIssue ? F.get('family.de310item10', ID, { label: 'DE-310 item 10 (no issue survived): first box that applies: a parents, b sibling or issue of a deceased sibling, c other heirs, d no known next of kin', type: 'choice', options: ['a', 'b', 'c', 'd'] }) : undefined;
  f.check(`${P2}LI10[0].NoIssue_cb[0]`, s.noIssue ? true : (s.child === undefined || s.ipc === undefined ? undefined : false), { item: '10', label: 'Decedent survived by (no issue)', source: `${s.childSrc}; ${s.ipcSrc}` });
  for (const [k, n] of [['a', 'lia[0].Parent_cb[0]'], ['b', 'lib[0].Sibling_cb[0]'], ['c', 'lic[0].OtherHeirs_cb[0]'], ['d', 'lid[0].NoNxtofKin_cb[0]']]) {
    f.check(`${P2}LI10[0].${n}`, s.noIssue ? (i10 === undefined ? undefined : i10 === k) : false, { item: `10${k}`, source: s.noIssue ? F.src('family.de310item10') : 'Not applicable: issue survived (or unknown)', need: s.noIssue ? 'family.de310item10' : undefined });
  }

  // 11 Attachment 11 (property)
  const legal = F.get('property.legalDescription', ID, { label: 'Legal description of the residence, copied exactly from the deed', type: 'text' });
  const apn = parcel && parcel.p.apn ? { value: parcel.p.apn, source: `case.assets.realProperty[${parcel.i}].apn` } : F.v('property.apn', ID, { label: "Assessor's Parcel Number of the residence", type: 'text' });
  const interest = F.get('property.decedentInterest', ID, { label: "Decedent's interest in the residence (for example: 100% fee simple; an undivided one-half interest as tenant in common)", type: 'text' });
  const prFacts = F.get('property.primaryResidenceFacts', ID, { label: 'Facts showing the property was the decedent\'s primary residence in California (Prob. Code 13150(b)(2))', type: 'text' });
  const character = will === false ? F.get('property.character', ID, { label: 'Intestate claim: was the residence community, separate, or quasi-community property? State the facts.', type: 'text' }) : undefined;
  ctx.att11 = [
    ['Address', parcel ? parcelAddress(parcel.p) : '[ANSWER NEEDED: property]'],
    ['Legal description', legal || '[ANSWER NEEDED: legal description]'],
    ["Assessor's Parcel Number", apn ? apn.value : '[ANSWER NEEDED: APN]'],
    ["Decedent's interest", interest || '[ANSWER NEEDED: decedent\'s interest]'],
    ['Facts showing primary residence', prFacts || '[ANSWER NEEDED: primary residence facts]'],
    ...(will === false ? [['Character (community, separate, quasi-community)', character || '[ANSWER NEEDED: character of property]']] : []),
  ];

  // 12 successor basis
  f.check(`${P2}Item12[0].Item12a[0].HeirYN[0]`, will, { item: '12a', label: '(will) beneficiary under the will', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P2}Item12[0].Item12b[0].HeirYN[0]`, will === undefined ? undefined : will === false, { item: '12b', label: '(no will) heir under 6401, 6402', source: F.src('will.exists') });

  // 13 interest of each petitioner
  const hs = heirs(F, ID);
  const pname = (F.opt('petitioner.name') || '').toLowerCase();
  const me = hs.find((h) => h.name.toLowerCase() === pname);
  let interest13 = F.opt('succession.petitionerInterest');
  let src13 = F.src('succession.petitionerInterest');
  if (!interest13 && me && me.share) { interest13 = `${me.name}: an undivided ${me.share}% interest`; src13 = `case.heirs[${me.index}].sharePercentage`; }
  if (!interest13) F.need('succession.petitionerInterest', ID, { label: 'Interest of each petitioner in the residence (DE-310 item 13)', type: 'text' });
  f.check(`${P2}List13[0].LI13[0].BelAtt13[0]`, false, { item: '13', label: 'stated in Attachment 13', source: 'stated in item 13' });
  f.check(`${P2}List13[0].LI13[0].BelAtt13[1]`, interest13 ? true : undefined, { item: '13', label: 'is as follows', source: src13 });
  f.text(`${P2}List13[0].LI13[0].Field13[0]`, interest13 ? { value: interest13, source: src13 } : undefined, { item: '13', label: 'Interest of each petitioner', need: 'succession.petitionerInterest' });

  // 15 executors
  if (will === false) {
    f.check(`${P2}List15[0].LI15[0].WillYN[0]`, true, { item: '15', label: 'There is no will', source: F.src('will.exists') });
    for (const n of ['BelAtt15[0]', 'BelAtt15[1]', 'BelAtt15[2]']) f.check(`${P2}List15[0].LI15[0].${n}`, false, { item: '15', source: 'No will' });
    f.text(`${P2}List15[0].LI15[0].Field15[0]`, undefined, { item: '15', blankReason: 'No will' });
  } else {
    f.check(`${P2}List15[0].LI15[0].WillYN[0]`, will === undefined ? undefined : false, { item: '15', label: 'There is no will', source: F.src('will.exists') });
    const ex = will ? F.opt('will.executorName') : undefined;
    const none = ex && /^none$/i.test(String(ex).trim());
    let exAddr;
    if (ex && !none) {
      if (String(ex).toLowerCase().trim() === pname) { const pa = F.opt('petitioner.address'); exAddr = pa ? { value: oneLineAddress(pa), source: F.src('petitioner.address') } : undefined; }
      if (!exAddr) exAddr = F.v('will.executorAddress', ID, { label: `Address of ${ex}, executor named in the will`, type: 'text' });
    } else if (will && !ex) F.need('will.executorName', ID);
    f.check(`${P2}List15[0].LI15[0].BelAtt15[0]`, ex ? !none : undefined, { item: '15', label: 'listed below', source: F.src('will.executorName'), need: 'will.executorName' });
    f.check(`${P2}List15[0].LI15[0].BelAtt15[1]`, ex ? false : undefined, { item: '15', label: 'listed in Attachment 15', source: F.src('will.executorName') });
    f.check(`${P2}List15[0].LI15[0].BelAtt15[2]`, ex ? !!none : undefined, { item: '15', label: 'No executor is named', source: F.src('will.executorName') });
    f.text(`${P2}List15[0].LI15[0].Field15[0]`, ex && !none && exAddr ? { value: `${ex}, ${exAddr.value}`, source: `${F.src('will.executorName')}; ${exAddr.source}` } : undefined, { item: '15', label: 'Executors named in will (names and addresses)', need: ex && !none ? 'will.executorAddress' : undefined, blankReason: none ? 'No executor named' : '' });
  }

  // 16 trustee
  const trustee = will === true ? F.get('succession.petitionerIsTrustee', ID, { label: 'Is the petitioner the trustee of a trust designated in the will to receive property?', type: 'yesno' }) : (will === false ? false : undefined);
  f.check(`${P2}List16[0].LI16[0].Trustee[0]`, trustee, { item: '16', label: 'Petitioner is trustee of a trust under the will', source: will === false ? 'No will' : F.src('succession.petitionerIsTrustee'), need: 'succession.petitionerIsTrustee' });
  if (trustee === true) ctx.warnings.push('Attachment 16: list every person interested in the trust (Prob. Code 15804).');

  // 17 guardianship/conservatorship
  const gc = F.get('decedent.underConservatorship', ID, { label: "Was the decedent's estate under a guardianship or conservatorship at death? (no, guardianship, conservatorship)", type: 'choice', options: ['no', 'guardianship', 'conservatorship'] });
  f.check(`${P2}List17[0].LI17[0].EstateGC_cb[0]`, gc === undefined ? undefined : gc !== 'no', { item: '17', label: 'Estate under guardianship/conservatorship', source: F.src('decedent.underConservatorship'), need: 'decedent.underConservatorship' });
  f.check(`${P2}List17[0].LI17[0].GC[0]`, gc === undefined ? undefined : gc === 'guardianship', { item: '17', label: 'guardianship', source: F.src('decedent.underConservatorship') });
  f.check(`${P2}List17[0].LI17[0].GC[1]`, gc === undefined ? undefined : gc === 'conservatorship', { item: '17', label: 'conservatorship', source: F.src('decedent.underConservatorship') });
  const gcList = gc && gc !== 'no' ? F.v('decedent.guardianConservator', ID, { label: 'Name and address of each guardian or conservator serving at death', type: 'text' }) : undefined;
  f.check(`${P2}List17[0].LI17[0].BelAtt17[0]`, gc && gc !== 'no' ? true : false, { item: '17', label: 'are listed below', source: F.src('decedent.underConservatorship') });
  f.check(`${P2}List17[0].LI17[0].BelAtt17[1]`, false, { item: '17', label: 'are listed in Attachment 17', source: 'listed in item 17 if any' });
  f.text(`${P2}List17[0].LI17[0].Field17[0]`, gcList, { item: '17', label: 'Guardian or conservator names and addresses', blankReason: 'No guardianship or conservatorship', need: gc && gc !== 'no' ? 'decedent.guardianConservator' : undefined });

  // 18 and signatures
  f.text(`${P2}List18[0].LI18[0].NumPPAtt[0]`, undefined, { item: '18', label: 'Number of pages attached', blankReason: 'Count after the appraisal, DE-300 and will copy are attached' });
  f.text(`${P2}AttySigBlock[0].SigDateAtty[0]`, undefined, { item: 'Signature', label: 'Date (attorney)', blankReason: 'Self-represented petitioner: no attorney signs' });
  f.text(`${P2}AttySigBlock[0].NmAtty[0]`, undefined, { item: 'Signature', label: 'Attorney name', blankReason: 'Self-represented petitioner: no attorney signs' });
  f.text(`${P2}PtnrSigBlock[0].Pet1[0].SigDatePtnrs[0]`, undefined, { item: 'Verification', label: 'Date (petitioner)', blankReason: 'Dated when signed' });
  f.text(`${P2}PtnrSigBlock[0].Pet1[0].NmPtnr1[0]`, pn ? { value: pn.value, source: pn.source } : undefined, { item: 'Verification', label: 'Petitioner name', need: 'petitioner.name' });
  f.text(`${P2}PtnrSigBlock[0].Pet2[0].NmPtnr2[0]`, undefined, { item: 'Verification', label: 'Second petitioner', blankReason: 'One petitioner in file' });
  f.check(`${P2}PtnrSigBlock[0].Pet2[0].ExtraPets_cb[0]`, false, { item: 'Verification', label: 'Additional petitioner signatures attached', source: 'One petitioner in file' });

  // 14: heirs, devisees (Attachment 14)
  ctx.att14 = hs.map((h) => [`${h.name}, ${h.relationship}${h.deceased ? ' (deceased)' : ''}`, h.age || (h.deceased ? '' : '[ANSWER NEEDED: age]'), h.address || '[ANSWER NEEDED: address]']);
  F.get('family.heirsListComplete', ID);
}

async function after(doc, F, ctx) {
  const estate = (F.opt('decedent.name') || ''); const caseNumber = F.opt('case.number') || '';
  await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 11', intro: 'Legal description and Assessor\'s Parcel Number of the real property claimed; decedent\'s interest; facts showing it was the decedent\'s primary residence in California.', columns: [{ title: 'Item', width: 150 }, { title: 'Statement', width: 390 }], rows: ctx.att11 || [] });
  await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 14', intro: 'Names, relationships to decedent, ages, and residence or mailing addresses of the persons described in item 14.', columns: [{ title: 'Name and relationship', width: 200 }, { title: 'Age', width: 50 }, { title: 'Address', width: 290 }], rows: ctx.att14 || [] });
}

module.exports = {
  id: ID, kind: 'jc', title: 'Petition to Determine Succession to Primary Residence', revision: 'Rev. April 28, 2025', template: 'DE-310.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de310.pdf', procedures: ['13151'], fill, after,
};
