// DE-120 Notice of Hearing, Decedent's Estate or Trust (Rev. January 1, 2020). Prob. Code 1211,
// 1215, 1220. Used for the 13151 primary residence petition (13153), the spousal or domestic
// partner property petition (13655) and the petition for final distribution (11601).
// Never for a petition to administer an estate: that notice is DE-121 (Prob. Code 8100; the form's
// own footnote).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { fmtDate } = require('../format');
const { appendTableAttachment } = require('../attach');
const { capacity, prName } = require('../logic');
const { residenceParcel, parcelAddress } = require('../smallestate');

const ID = 'DE-120';
const P1 = 'DE-120[0].Page1[0].';
const P2 = 'DE-120[0].Page2[0].';
const CAP_TITLE = { executor: 'Executor', 'administrator with will annexed': 'Administrator with Will Annexed', administrator: 'Administrator' };

function purposeOf(F, extra) {
  if (extra && ['13151', '13650', 'final'].includes(extra.purpose)) return { value: extra.purpose, source: 'chosen in the admin (extra.purpose)' };
  const st = String(F.caseData.serviceType || '').toLowerCase();
  if (/simplif|13151|residence|succession/.test(st)) return { value: '13151', source: 'case.serviceType' };
  if (/spous|13650|partner/.test(st)) return { value: '13650', source: 'case.serviceType' };
  if (st === 'full' || /probate|administ/.test(st)) return { value: 'final', source: 'case.serviceType (full probate: DE-120 is used for the final distribution petition)' };
  return undefined;
}

async function fill(f, F, ctx) {
  const purpose = purposeOf(F, ctx.extra);
  if (!purpose) F.need('de120.purpose', ID, { label: 'What is this notice of hearing for? (13151 primary residence petition, 13650 spousal property petition, final distribution petition)', type: 'choice', options: ['13151', '13650', 'final'] });
  const pv = purpose ? purpose.value : F.opt('de120.purpose');
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  for (const pg of [P1 + 'p1Caption[0].', P2]) {
    f.check(`${pg}TitlePartyName[0].name_cb[0]`, true, { item: 'Caption', label: 'ESTATE OF', source: 'Decedent estate' });
    f.check(`${pg}TitlePartyName[0].name_cb[1]`, false, { item: 'Caption', label: 'IN THE MATTER OF', source: 'Decedent estate' });
    f.check(`${pg}TitlePartyName[0].status_cb[0]`, true, { item: 'Caption', label: 'DECEDENT', source: 'Decedent estate' });
    f.check(`${pg}TitlePartyName[0].status_cb[1]`, false, { item: 'Caption', label: 'TRUST', source: 'Decedent estate' });
    f.check(`${pg}TitlePartyName[0].status_cb[2]`, false, { item: 'Caption', label: 'OTHER', source: 'Decedent estate' });
  }

  // 1. who filed what
  const L1 = `${P1}List1[0].LI1[0].`;
  let who; let cap; let desc; let descSrc;
  if (pv === 'final') {
    who = prName(F, ID);
    const c = capacity(F, ID);
    cap = c ? { value: c.value === 'administrator with will annexed' ? 'Administrator with will annexed' : c.value.charAt(0).toUpperCase() + c.value.slice(1), source: c.source } : undefined;
    const waived = F.get('final.accountingWaived', ID, { label: 'Final distribution: are all distributees waiving the account (Prob. Code 10954), so the filing is a report on waiver of account?', type: 'yesno' });
    const t = waived === undefined ? undefined : `${waived ? 'First and Final Report' : 'First and Final Account and Report'} of ${CAP_TITLE[c && c.value] || 'Personal Representative'}${waived ? ' on Waiver of Account' : ''} and Petition for Final Distribution; and for Allowance of Statutory Compensation`;
    desc = t ? `${t} (Prob. Code 11640). The petition asks the court to settle the ${waived ? 'report' : 'account'}, allow statutory compensation, and order distribution of the estate to the persons entitled to it.` : undefined;
    descSrc = `${F.src('final.accountingWaived')}; ${c ? c.source : ''}`;
    if (!desc) F.need('final.accountingWaived', ID);
  } else if (pv === '13151') {
    who = F.v('petitioner.name', ID);
    const parcel = residenceParcel(F, ID);
    desc = parcel ? `Petition to Determine Succession to Primary Residence (form DE-310; Prob. Code 13151). The petition asks the court to determine that the real property at ${parcelAddress(parcel.p)} was the decedent's primary residence in California and passes to the petitioner.` : undefined;
    descSrc = parcel ? `case.assets.realProperty[${parcel.i}].address` : '';
  } else if (pv === '13650') {
    who = F.v('petitioner.name', ID);
    const rdp = F.opt('family.rdpSurvived') === true;
    desc = `${rdp ? 'Domestic Partner' : 'Spousal'} Property Petition (form DE-221; Prob. Code 13650). The petition asks the court to determine property passing to, and to confirm property belonging to, the surviving ${rdp ? 'registered domestic partner' : 'spouse'}.`;
    descSrc = `${F.src('family.spouseSurvived')}`;
  }
  f.text(`${L1}Name1[0]`, who, { item: '1', label: 'Notice is given that (name)', need: 'petitioner.name' });
  f.text(`${L1}Capacity1[0]`, pv === 'final' ? cap : undefined, { item: '1', label: 'Fiduciary or representative capacity', blankReason: pv === 'final' ? '' : 'Petitioner files in an individual capacity', need: pv === 'final' ? 'pr.capacity' : undefined });
  f.text(`${L1}Description1[0]`, desc ? { value: desc, source: descSrc } : undefined, { item: '1', label: 'Title and description of the filing', need: pv ? (pv === '13151' ? 'estate.realProperty' : 'final.accountingWaived') : 'de120.purpose' });
  f.check(`${L1}CheckBoxCopy[0]`, false, { item: '1', label: 'Report of status under Prob. Code 12200', source: 'Not a status report' });

  // 2. hearing
  const H = `${P1}List2[0].LI1[0].HearingInfo[0].`;
  const dk = pv === 'final' ? 'final.hearingDate' : 'hearing.date';
  const tk = pv === 'final' ? 'final.hearingTime' : 'hearing.time';
  const hd = F.get(dk, ID, { label: pv === 'final' ? 'Hearing date of the petition for final distribution' : 'Hearing date', type: 'date' });
  f.text(`${H}HearingDate[1]`, hd ? { value: fmtDate(hd), source: F.src(dk) } : undefined, { item: '2', label: 'Hearing date', need: dk });
  f.text(`${H}HearingTime[0]`, F.v(tk, ID, { label: pv === 'final' ? 'Hearing time of the petition for final distribution' : 'Hearing time', type: 'text' }), { item: '2', label: 'Time', need: tk });
  f.text(`${H}HearingDept[0]`, F.v('hearing.dept', ID), { item: '2', label: 'Dept.', need: 'hearing.dept' });
  f.text(`${H}HearingRm[0]`, F.opt('hearing.room') ? F.v('hearing.room') : undefined, { item: '2', label: 'Room', blankReason: 'No room in file' });
  const same = F.get('hearing.sameAddress', ID, { label: 'Is the hearing at the court address shown in the caption?', type: 'yesno' });
  f.text(`${H}HearingCourtAdd[0]`, same === false ? F.v('hearing.otherAddress', ID, { label: 'Hearing court name and address (if not the caption address)', type: 'text' }) : undefined, { item: '2', label: 'Court name and address if different', blankReason: same === true ? 'Same as caption' : '', need: same === undefined ? 'hearing.sameAddress' : (same === false ? 'hearing.otherAddress' : undefined) });

  // page 2: clerk's posting and proof of service are completed later; only the persons to be
  // served are prefilled from the heirs list (without the petitioner).
  for (const n of ['PostingList2[0].LI1[0].postataddy[0]', 'PostingList2[0].LI2[0].poston_date[0]', 'ClerkSigDate[0]', 'Clerk[0]']) f.text(`${P2}${n}`, undefined, { item: 'Clerk posting', blankReason: 'Completed by the clerk if posted' });
  for (const n of ['ServiceList2[0].LI1[0].Field2[0]', 'ServiceList4[0].LI1[0].Datemail[0]', 'ServiceList4[0].LI2[0].placemail[0]', '#area[0].Date[0]']) f.text(`${P2}${n}`, undefined, { item: 'Proof of service', blankReason: 'Completed by the person who mails the notice' });
  for (const n of ['ServiceList3[0].LI1[0].CheckBox3a[0]', 'ServiceList3[0].LI2[0].CheckBox3b[0]', 'ServiceList5[0].LI1[0].CheckBoxCopy[0]']) f.check(`${P2}${n}`, false, { item: 'Proof of service', source: 'Completed by the person who mails the notice' });
  const petName = (F.opt('petitioner.name') || '').toLowerCase();
  const serve = heirs(F, ID).filter((h) => !h.deceased && h.name.toLowerCase() !== petName);
  const fits = serve.length <= 5;
  for (let i = 0; i < 5; i++) {
    const h = fits ? serve[i] : undefined;
    const L = `${P2}NoticeList[0].LI${i + 1}[0].`;
    f.text(`${L}servname${i + 1}[0]`, h ? { value: h.name, source: h.nameSource } : undefined, { item: 'Persons served', label: `Name ${i + 1}`, blankReason: fits ? 'no more persons' : 'See attachment' });
    f.text(`${L}servaddy${i + 1}[0]`, h && h.address ? { value: h.address, source: h.addrSource } : undefined, { item: 'Persons served', label: `Address ${i + 1}`, need: h && !h.address ? `${h.key}.address` : undefined, blankReason: fits ? 'no more persons' : 'See attachment' });
  }
  f.check(`${P2}CheckBoxAttach[0]`, !fits, { item: 'Persons served', label: 'Continued on an attachment', source: `${serve.length} persons` });
  if (!fits) ctx.attach = serve.map((h) => [h.name, h.address]);
  const recipients = pv === 'final' ? 'each heir and devisee affected, and the others listed in Prob. Code 1220 and 11601' : pv === '13151' ? 'each person named in the petition under Prob. Code 13152 (13153, 1220)' : 'the persons listed in Prob. Code 13655 (1220)';
  ctx.warnings.push(`Serve at least 15 days before the hearing (Prob. Code 1220) on ${recipients}. The service list is prefilled from the heirs in the file; check it is complete.`);
  if (pv === '13151') ctx.warnings.push('Prob. Code 13151(b): within 5 business days after filing, notice of the petition must also go to each heir and devisee named under 13152(a)(7).');
}

module.exports = {
  id: ID, kind: 'jc', title: "Notice of Hearing, Decedent's Estate or Trust", revision: 'Rev. January 1, 2020', template: 'DE-120.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de120.pdf', procedures: ['13151', '13650', 'full'],
  note: 'For 13151, 13650 and final distribution. Never for the petition to administer (use DE-121).',
  fill,
  after: async (doc, F, ctx) => {
    if (ctx.attach) await appendTableAttachment(doc, { estate: (F.opt('decedent.name') || '').toUpperCase(), caseNumber: F.opt('case.number') || '', formId: ID, title: 'ATTACHMENT: NAME AND ADDRESS OF EACH PERSON TO WHOM NOTICE WAS MAILED', columns: [{ title: 'Name', width: 200 }, { title: 'Address', width: 340 }], rows: ctx.attach });
  },
};
