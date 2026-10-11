// DE-221 Spousal or Domestic Partner Property Petition (Rev. January 1, 2014). Prob. Code 13650,
// 13651; Fam. Code 297.5. Set: DE-221 with Attachments 4c (will), 7, 7a, 7b, 8 (agreement), 9;
// notice of hearing DE-120 (13655, 1220); order DE-226 (13656).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { fmtDate } = require('../format');
const { oneLineAddress } = require('../facts');
const { appendTableAttachment } = require('../attach');
const { survivors } = require('../smallestate');

const ID = 'DE-221';
const P1 = 'DE-221[0].Page1[0].';
const P2 = 'DE-221[0].Page2[0].';

// Is the surviving partner a spouse or a registered domestic partner? From the file only.
function partnerKind(F, form) {
  if (F.opt('family.rdpSurvived') === true || F.opt('decedent.maritalStatus') === 'registered domestic partner') return { value: 'rdp', source: F.opt('family.rdpSurvived') === true ? F.src('family.rdpSurvived') : F.src('decedent.maritalStatus') };
  const sp = F.get('family.spouseSurvived', form);
  if (sp === true) return { value: 'spouse', source: F.src('family.spouseSurvived') };
  return undefined;
}

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F, { estateFields: [`${P1}P1Caption[0].TitlePartyName[0].Name1[0]`, `${P2}PxCaption[0].TitlePartyName[0].Name1[0]`], caseFields: [`${P1}P1Caption[0].Stamp[0].CaseNumber[0].CaseNumber[0]`, `${P2}PxCaption[0].CaseNumber[0].CaseNumber[0]`] });
  const hd = F.opt('hearing.date');
  f.text(`${P1}P1Caption[0].Stamp[0].HearingDate[0].HearingDate[0]`, hd ? { value: fmtDate(hd), source: F.src('hearing.date') } : undefined, { item: 'Caption', label: 'Hearing date', blankReason: 'Set by the clerk at filing' });
  f.text(`${P1}P1Caption[0].Dept[0].dept[0]`, F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: 'Caption', label: 'Dept.', blankReason: 'Set by the clerk at filing' });
  f.text(`${P1}P1Caption[0].Dept[0].time[0]`, F.opt('hearing.time') ? F.v('hearing.time') : undefined, { item: 'Caption', label: 'Time', blankReason: 'Set by the clerk at filing' });
  const kind = partnerKind(F, ID);
  if (!kind) F.need('family.spouseSurvived', ID, { label: 'Spousal property petition: was the decedent survived by a spouse (or a registered domestic partner)?', type: 'yesno' });
  f.check(`${P1}P1Caption[0].FormTitle[0].#area[0].CheckBoxCaption[0]`, kind ? kind.value === 'spouse' : undefined, { item: 'Title', label: 'Spousal', source: kind && kind.source });
  f.check(`${P1}P1Caption[0].FormTitle[0].#area[1].CheckBoxCaption[1]`, kind ? kind.value === 'rdp' : undefined, { item: 'Title', label: 'Domestic Partner', source: kind && kind.source });

  // 1 requests
  const pn = F.v('petitioner.name', ID);
  f.text(`${P1}List1[0].TextField[0]`, pn, { item: '1', label: 'Petitioner', need: 'petitioner.name' });
  const passing = F.get('spousal.passing', ID, { label: 'Request a determination of property passing to the surviving spouse or partner without administration (Prob. Code 13500)?', type: 'yesno' });
  const confirm = F.get('spousal.confirmation', ID, { label: 'Request confirmation of property belonging to the surviving spouse or partner (Prob. Code 100, 101)?', type: 'yesno' });
  const referee = F.get('spousal.immediateReferee', ID, { label: 'Request immediate appointment of a probate referee?', type: 'yesno' });
  f.check(`${P1}List1[0].LI1[0].#area[0].CheckBox1[0]`, passing, { item: '1a', label: 'determination of property passing', source: F.src('spousal.passing'), need: 'spousal.passing' });
  f.check(`${P1}List1[0].LI2[0].#area[0].CheckBox2[0]`, confirm, { item: '1b', label: 'confirmation of property belonging', source: F.src('spousal.confirmation'), need: 'spousal.confirmation' });
  f.check(`${P1}List1[0].LI3[0].#area[0].CheckBox3[0]`, referee, { item: '1c', label: 'immediate appointment of probate referee', source: F.src('spousal.immediateReferee'), need: 'spousal.immediateReferee' });

  // 2 petitioner capacity: the surviving partner personally, when the relationship says so
  const rel = String(F.opt('petitioner.relationship') || '').toLowerCase();
  let pcap = F.opt('spousal.petitionerCapacity'); let pcapSrc = F.src('spousal.petitionerCapacity');
  if (!pcap && /spouse|wife|husband/.test(rel)) { pcap = 'surviving spouse'; pcapSrc = F.src('petitioner.relationship'); }
  if (!pcap && /domestic partner/.test(rel)) { pcap = 'surviving registered domestic partner'; pcapSrc = F.src('petitioner.relationship'); }
  if (!pcap) F.need('spousal.petitionerCapacity', ID, { label: 'Petitioner is: surviving spouse, surviving registered domestic partner, or the personal representative / guardian / conservator of the survivor?', type: 'choice', options: ['surviving spouse', 'surviving registered domestic partner', 'personal representative of spouse', 'guardian or conservator of spouse', 'personal representative of partner', 'conservator of partner'] });
  const L2 = `${P1}List2[0].`;
  const boxes = [
    ['Itema[0].#area[0].CheckBox1[0]', 'surviving spouse'],
    ['Itemb[0].CheckBox1[0]', 'personal representative of spouse'],
    ['Itemc[0].#area[0].CheckBox1[0]', 'guardian or conservator of spouse'],
    ['Itemd[0].#area[0].CheckBox1[0]', 'surviving registered domestic partner'],
    ['Iteme[0].CheckBox1[0]', 'personal representative of partner'],
    ['Itemf[0].CheckBox1[0]', 'conservator of partner'],
  ];
  boxes.forEach(([n, v], i) => f.check(`${L2}${n}`, pcap ? pcap === v : undefined, { item: `2${'abcdef'[i]}`, label: v, source: pcapSrc, need: 'spousal.petitionerCapacity' }));
  const repName = pcap && !/^surviving/.test(pcap) ? F.v('spousal.survivorName', ID, { label: 'Name of the surviving spouse or partner the petitioner represents', type: 'text' }) : undefined;
  f.text(`${L2}Itemb[0].name[0]`, pcap === 'personal representative of spouse' ? repName : undefined, { item: '2b', label: 'Name', blankReason: 'Not applicable' });
  f.text(`${L2}Itemc[0].#area[0].name[0]`, pcap === 'guardian or conservator of spouse' ? repName : undefined, { item: '2c', label: 'Name', blankReason: 'Not applicable' });
  f.text(`${L2}Iteme[0].TextField[0]`, pcap === 'personal representative of partner' ? repName : undefined, { item: '2e', label: 'Name', blankReason: 'Not applicable' });
  f.text(`${L2}Itemf[0].name[0]`, pcap === 'conservator of partner' ? repName : undefined, { item: '2f', label: 'Name', blankReason: 'Not applicable' });

  // 3, 4
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${P1}List3[0].Item[0].on_date[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '3', label: 'Decedent died on', need: 'decedent.dateOfDeath' });
  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty'); const crt = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crt && resCounty.toLowerCase() === crt.toLowerCase();
  f.check(`${P1}List4[0].Itema[0].#area[0].CheckBox1[0]`, caRes === undefined ? undefined : !!inCounty, { item: '4a', label: 'resident of the county', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')}`, need: 'decedent.caResident' });
  f.check(`${P1}List4[0].Itemb[0].#area[0].CheckBox1[0]`, caRes === undefined ? undefined : caRes === false, { item: '4b', label: 'nonresident', source: F.src('decedent.caResident') });
  const will = F.get('will.exists', ID);
  f.check(`${P1}List4[0].Itemc[0].#area[0].CheckBox1[0]`, will === undefined ? undefined : will === false, { item: '4c', label: 'intestate', source: F.src('will.exists'), need: 'will.exists' });
  f.check(`${P1}List4[0].Itemc[0].#area[0].#area[1].CheckBox2[0]`, will, { item: '4c', label: 'testate (will attached as 4c)', source: F.src('will.exists') });
  if (will) ctx.warnings.push('Attachment 4c: attach copies of the will and any codicil (typed copy of any handwritten document).');

  // 5 survivors
  const s = survivors(F, ID);
  const L5 = `${P1}List5[0].ItemaSub[0].`;
  f.check(`${L5}List5a1Sub[0].ItemsSub[0].#area[0].CheckBox1[0]`, s.child === undefined ? undefined : s.child === false, { item: '5a(1)', label: 'no child', source: s.childSrc, need: 'family.childSurvived' });
  f.check(`${L5}List5a1Sub[0].ItemsSub[0].#area[1].CheckBox2[0]`, s.child, { item: '5a(1)', label: 'child as follows', source: s.childSrc });
  f.check(`${L5}List5a1Sub[0].ItemsSub[0].#area[2].CheckBox3[0]`, s.child === true ? (s.childType === undefined ? undefined : s.childType !== 'natural adopted by a third party') : false, { item: '5a(1)', label: 'natural or adopted', source: s.child === true ? s.childTypeSrc : 'no child or unknown', need: s.child === true ? 'family.childType' : undefined });
  f.check(`${L5}List5a1Sub[0].ItemsSub[0].#area[3].CheckBox4[0]`, s.child === true ? (s.childType === undefined ? undefined : s.childType !== 'natural or adopted') : false, { item: '5a(1)', label: 'natural, adopted by a third party', source: s.child === true ? s.childTypeSrc : 'no child or unknown' });
  f.check(`${L5}List5a2Sub[0].Item[0].#area[0].CheckBox1[0]`, s.ipc === undefined ? undefined : s.ipc === false, { item: '5a(2)', label: 'no issue of a predeceased child', source: s.ipcSrc, need: 'family.issueOfPredeceasedChild' });
  f.check(`${L5}List5a2Sub[0].Item[0].#area[1].CheckBox2[0]`, s.ipc, { item: '5a(2)', label: 'issue of a predeceased child', source: s.ipcSrc });
  f.check(`${P1}List5[0].ItembSub[0].#area[0].CheckBox1[0]`, s.step, { item: '5b', label: 'is survived by stepchild/foster child', source: s.stepSrc, need: 'family.stepchild' });
  f.check(`${P1}List5[0].ItembSub[0].#area[1].CheckBox2[0]`, s.step === undefined ? undefined : s.step === false, { item: '5b', label: 'is not', source: s.stepSrc });
  const i6 = s.noIssue ? F.get('family.de221item6', ID, { label: 'DE-221 item 6 (no issue survived): first that applies: a parent(s), b brother/sister or their issue, or neither', type: 'choice', options: ['a', 'b', 'neither'] }) : undefined;
  f.check(`${P1}List6[0].ItemaSub[0].#area[0].CheckBox1[0]`, s.noIssue ? (i6 === undefined ? undefined : i6 === 'a') : false, { item: '6a', label: 'survived by parent(s)', source: s.noIssue ? F.src('family.de221item6') : 'Not applicable: issue survived (or unknown)', need: s.noIssue ? 'family.de221item6' : undefined });
  f.check(`${P1}List6[0].ItembSub[0].#area[0].CheckBox2[0]`, s.noIssue ? (i6 === undefined ? undefined : i6 === 'b') : false, { item: '6b', label: 'survived by sibling(s) or their issue', source: s.noIssue ? F.src('family.de221item6') : 'Not applicable' });

  // 7 attachments with the facts and property descriptions (never in intake: Rozsa supplies them)
  const facts7 = F.get('spousal.attachment7Facts', ID, { label: 'Attachment 7: facts showing the property passes to or belongs to the surviving spouse or partner (marriage date, how and when acquired, title, character)', type: 'text' });
  const a7a = passing === true ? F.get('spousal.attachment7a', ID, { label: "Attachment 7a: legal description (and APN for real property) of the decedent's property passing to the survivor", type: 'text' }) : undefined;
  const a7b = confirm === true ? F.get('spousal.attachment7b', ID, { label: "Attachment 7b: legal description (and APN for real property) of the community or quasi-community property belonging to the survivor", type: 'text' }) : undefined;
  f.check(`${P1}List7[0].ItemaSub[0].#area[0].CheckBox1[0]`, passing === undefined ? undefined : passing === true, { item: '7a', label: 'Attachment 7a (property passing)', source: F.src('spousal.passing') });
  f.check(`${P2}List7[0].ItembSub[0].#area[0].CheckBox1[0]`, confirm === undefined ? undefined : confirm === true, { item: '7b', label: 'Attachment 7b (property confirmed)', source: F.src('spousal.confirmation') });
  // Prob. Code 13500: property passes without administration when the spouse died intestate (6401)
  // or "dies testate and by his or her will devises all or a part of his or her property to the
  // surviving spouse". For a testate decedent, ask; never assume the gift.
  let willGift;
  if (passing === true && will === true) {
    willGift = F.get('spousal.willGivesToSpouse', ID, { label: "Does the decedent's will give the property in Attachment 7a to the surviving spouse or partner? (Prob. Code 13500)", type: 'yesno' });
    if (willGift === false) ctx.warnings.push("Attachment 7a: the will does not give this property to the surviving spouse, so it does not pass under Prob. Code 13500; remove it from 7a or use another procedure.");
  }
  // legal description of each parcel named in 7a / 7b (LASC LR 4.29(d)(3) for the order)
  const { legalDescription } = require('../admin-helpers');
  const rpl = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  const parcelRows = (txt) => rpl.map((p, i) => ({ p, i })).filter(({ p }) => txt && p.address && String(txt).toLowerCase().includes(String(p.address).split(',')[0].toLowerCase())).map(({ p, i }) => {
    const ld = legalDescription(F, ID, p, i);
    f.info(`Attachment 7 parcel ${i + 1}`, ld ? ld.value : '(legal description needed)', { item: '7a/7b', label: `Legal description of ${p.address}`, source: ld ? ld.source : 'NEEDS ANSWER' });
    return `Real property commonly known as ${p.address}${p.apn ? `, Assessor's Parcel No. ${p.apn}` : ''}, legally described as: ${ld ? ld.value : '[ANSWER NEEDED: legal description from the deed]'}`;
  });
  const pk = partnerKind(F, ID);
  const giftLine = willGift === true ? `The decedent's will gives the property described in Attachment 7a to the surviving ${pk && pk.value === 'rdp' ? 'registered domestic partner' : 'spouse'} (Prob. Code 13500).` : null;
  ctx.att7 = { facts7: facts7 && giftLine ? `${facts7} ${giftLine}` : facts7, a7a, a7b, passing, confirm, rows7a: parcelRows(a7a), rows7b: parcelRows(a7b) };
  ctx.warnings.push('Prob. Code 13658: if an unincorporated business passes, include the list of its known creditors in Attachment 7a.');

  // 8 agreement
  const agr = F.get('spousal.nonProRataAgreement', ID, { label: 'Is there a written agreement between the spouses or partners for a non pro rata division of community or quasi-community property?', type: 'yesno' });
  f.check(`${P2}List8[0].Item[0].#area[0].CheckBoxCaption[0]`, agr, { item: '8', label: 'exists', source: F.src('spousal.nonProRataAgreement'), need: 'spousal.nonProRataAgreement' });
  f.check(`${P2}List8[0].Item[0].#area[1].CheckBoxCaption[1]`, agr === undefined ? undefined : agr === false, { item: '8', label: 'does not exist', source: F.src('spousal.nonProRataAgreement') });
  if (agr) ctx.warnings.push('Attachment 8: attach a copy of the written agreement (Prob. Code 13651(c)).');

  // 9 heirs and devisees: 3 rows on the form, more in Attachment 9
  const hs = heirs(F, ID);
  F.get('family.heirsListComplete', ID);
  const fits = hs.length <= 3;
  f.check(`${P2}List9[0].List[0].#area[0].CheckBox1[0]`, fits, { item: '9', label: 'are listed below', source: `${hs.length} persons in case.heirs` });
  f.check(`${P2}List9[0].List[0].#area[1].CheckBox2[0]`, !fits, { item: '9', label: 'are listed in Attachment 9', source: `${hs.length} persons in case.heirs` });
  const rows9 = [['TextField1[0]', 'TextField2[0]', 'TextField3[0]'], ['TextField4[0]', 'TextField5[0]', 'TextField6[0]'], ['TextField7[0]', 'TextField8[0]', 'TextField9[0]']];
  rows9.forEach(([a, b, c], i) => {
    const h = fits ? hs[i] : undefined;
    f.text(`${P2}List9[0].List[0].${a}`, h ? { value: `${h.name}, ${h.relationship}${h.deceased ? ' (deceased)' : ''}`, source: `${h.nameSource}; ${h.relSource}` } : undefined, { item: `9 row ${i + 1}`, label: 'Name and relationship', blankReason: fits ? 'no more persons' : 'See Attachment 9' });
    f.text(`${P2}List9[0].List[0].${b}`, h && h.age ? { value: h.age, source: h.ageSource } : undefined, { item: `9 row ${i + 1}`, label: 'Age', blankReason: h ? (h.deceased ? 'Deceased' : '') : (fits ? 'no more persons' : 'See Attachment 9'), need: h && !h.age && !h.deceased ? `${h.key}.age` : undefined });
    f.text(`${P2}List9[0].List[0].${c}`, h && h.address ? { value: h.address, source: h.addrSource } : undefined, { item: `9 row ${i + 1}`, label: 'Residence or mailing address', blankReason: fits ? 'no more persons' : 'See Attachment 9', need: h && !h.address ? `${h.key}.address` : undefined });
  });
  if (!fits) ctx.att9 = hs.map((h) => [`${h.name}, ${h.relationship}${h.deceased ? ' (deceased)' : ''}`, h.age, h.address]);

  // 10 executors / personal representatives
  const ex = will ? F.opt('will.executorName') : undefined;
  const pname = (F.opt('petitioner.name') || '').toLowerCase();
  let exLine;
  if (ex && !/^none$/i.test(ex)) {
    let addr;
    if (String(ex).toLowerCase().trim() === pname && F.opt('petitioner.address')) addr = { value: oneLineAddress(F.opt('petitioner.address')), source: F.src('petitioner.address') };
    else addr = F.v('will.executorAddress', ID, { label: `Address of ${ex}, executor named in the will`, type: 'text' });
    if (addr) exLine = { value: `${ex}, ${addr.value}`, source: `${F.src('will.executorName')}; ${addr.source}` };
  } else if (will && !ex) F.need('will.executorName', ID);
  const noneEx = will === false || (ex && /^none$/i.test(ex));
  f.check(`${P2}List10[0].Item[0].#area[0].CheckBox1[0]`, will === undefined ? undefined : !!exLine, { item: '10', label: 'are listed below', source: F.src('will.executorName') });
  f.check(`${P2}List10[0].Item[0].#area[1].CheckBox2[0]`, false, { item: '10', label: 'are listed in Attachment 10', source: 'listed in item 10' });
  f.check(`${P2}List10[0].Item[0].#area[2].CheckBox3[0]`, will === undefined ? undefined : !!noneEx, { item: '10', label: 'none', source: will === false ? F.src('will.exists') : F.src('will.executorName') });
  f.text(`${P2}List10[0].Item[0].TextField[0]`, exLine, { item: '10', label: 'Executors / personal representatives', blankReason: noneEx ? 'None' : '', need: ex && !exLine ? 'will.executorAddress' : undefined });

  // 11 trustee
  const trustee = will === true ? F.get('succession.petitionerIsTrustee', ID, { label: 'Is the petitioner the trustee of a trust that is a devisee under the will?', type: 'yesno' }) : (will === false ? false : undefined);
  f.check(`${P2}List11[0].Item[0].#area[0].CheckBox[0]`, trustee, { item: '11', label: 'Petitioner is trustee of a devisee trust', source: will === false ? 'No will' : F.src('succession.petitionerIsTrustee'), need: 'succession.petitionerIsTrustee' });

  // 12 probate petition
  const pp = F.get('spousal.probatePetitionStatus', ID, { label: 'A petition for probate or administration: is being filed with this petition, was filed (give date), or has not been and is not being filed?', type: 'choice', options: ['being filed', 'was filed', 'not filed'] });
  f.check(`${P2}List12[0].Item1[0].#area[0].CheckBox1[0]`, pp === undefined ? undefined : pp === 'being filed', { item: '12a', label: 'is being filed with this petition', source: F.src('spousal.probatePetitionStatus'), need: 'spousal.probatePetitionStatus' });
  f.check(`${P2}List12[0].Item2[0].#area[0].CheckBox2[0]`, pp === undefined ? undefined : pp === 'was filed', { item: '12b', label: 'was filed', source: F.src('spousal.probatePetitionStatus') });
  const ppDate = pp === 'was filed' ? F.get('spousal.probatePetitionDate', ID, { label: 'Date the probate petition was filed', type: 'date' }) : undefined;
  f.text(`${P2}List12[0].Item2[0].on_date_ft[0]`, ppDate ? { value: fmtDate(ppDate), source: F.src('spousal.probatePetitionDate') } : undefined, { item: '12b', label: 'Filed on', blankReason: 'Not applicable', need: pp === 'was filed' ? 'spousal.probatePetitionDate' : undefined });
  f.check(`${P2}List12[0].Item3[0].#area[0].CheckBox3[0]`, pp === undefined ? undefined : pp === 'not filed', { item: '12c', label: 'has not been filed', source: F.src('spousal.probatePetitionStatus') });

  f.text(`${P2}List13[0].Item[0].TextField[0]`, undefined, { item: '13', label: 'Number of pages attached', blankReason: 'Count after the will copy and attachments are added' });
  f.text(`${P2}Signature[0].SigDate1[0]`, undefined, { item: 'Signature', label: 'Date (attorney)', blankReason: 'Self-represented petitioner: no attorney signs' });
  f.text(`${P2}Signature[0].SigName1[0]`, undefined, { item: 'Signature', label: 'Attorney name', blankReason: 'Self-represented petitioner: no attorney signs' });
  f.text(`${P2}Signature[0].SigDate[0]`, undefined, { item: 'Verification', label: 'Date (petitioner)', blankReason: 'Dated when signed' });
  f.text(`${P2}Signature[0].SigName[0]`, pn ? { value: pn.value, source: pn.source } : undefined, { item: 'Verification', label: 'Petitioner name', need: 'petitioner.name' });
}

async function after(doc, F, ctx) {
  const estate = (F.opt('decedent.name') || ''); const caseNumber = F.opt('case.number') || '';
  const a = ctx.att7 || {};
  const cols = [{ title: '', width: 540 }];
  await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 7', intro: 'Facts on which petitioner bases the allegation that the property described in Attachments 7a and 7b should pass or be confirmed to the surviving spouse or registered domestic partner.', columns: cols, rows: [[a.facts7 || '[ANSWER NEEDED: Attachment 7 facts]']] });
  if (a.passing) await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 7a', intro: "Property of the deceased spouse or partner to be determined as having passed to the surviving spouse or partner.", columns: cols, rows: [[a.a7a || '[ANSWER NEEDED: Attachment 7a property description]'], ...(a.rows7a || []).map((r) => [r])] });
  if (a.confirm) await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 7b', intro: 'Community or quasi-community property to be confirmed as belonging to the surviving spouse or partner (Prob. Code 100, 101; Fam. Code 297.5).', columns: cols, rows: [[a.a7b || '[ANSWER NEEDED: Attachment 7b property description]'], ...(a.rows7b || []).map((r) => [r])] });
  if (ctx.att9) await appendTableAttachment(doc, { estate, caseNumber, formId: ID, title: 'ATTACHMENT 9', columns: [{ title: 'Name and relationship', width: 200 }, { title: 'Age', width: 50 }, { title: 'Address', width: 290 }], rows: ctx.att9 });
}

module.exports = {
  id: ID, kind: 'jc', title: 'Spousal or Domestic Partner Property Petition', revision: 'Rev. January 1, 2014', template: 'DE-221.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de221.pdf', procedures: ['13650'], fill, after, partnerKind,
};
