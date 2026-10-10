// BOE-502-D Change in Ownership Statement, Death of Real Property Owner. Rev. & Tax. Code 480(b):
// the personal representative files it with the assessor of each county where the decedent owned
// real property, before or with the inventory (Prob. Code 8800(d)); one statement per parcel.
// Template: the Los Angeles County Assessor issue, BOE-502-D (P1) REV. 15 (07-25) ASSR-176
// (REV. 10-25), downloaded 2026-10-10 from
// https://res.cloudinary.com/los-angeles-county-assessor/image/upload/v1622784606/Form/BOE-502-D.pdf
// (linked from assessor.lacounty.gov forms page). Only Los Angeles County parcels are generated;
// another county's parcel needs that assessor's own issue of the form (an error says so).
const { fmtDate } = require('../format');
const { oneLineAddress, S } = require('../facts');
const { capacity, prName } = require('../logic');
const { heirs } = require('../people');
const { parcels } = require('../admin-helpers');

const ID = 'BOE-502-D';

function records(F) {
  const ps = parcels(F, ID);
  return ps.map((p) => ({ label: `${p.label}${p.apn ? ` (APN ${p.apn})` : ''}`, parcel: p }));
}

function relKind(rel) {
  const r = String(rel || '').toLowerCase();
  if (/spouse|wife|husband/.test(r)) return 'spouse';
  if (/domestic partner/.test(r)) return 'rdp';
  if (/grand(son|daughter|child)/.test(r)) return 'grandchild';
  if (/^(son|daughter|child|mother|father|parent)/.test(r) || /\b(son|daughter|child|children|mother|father|parent)\b/.test(r)) return 'childParent';
  return 'other';
}

async function fill(f, F, ctx) {
  const p = ctx.record.parcel;
  const county = p.county || F.get(`${p.key}.county`, ID, { label: `County where the parcel at ${p.label} is located`, type: 'text' });
  if (county && !/^los angeles$/i.test(String(county).trim())) {
    throw new Error(`BOE-502-D: the parcel at ${p.label} is in ${county} County. Only the Los Angeles County Assessor issue is bundled; use that county assessor's BOE-502-D.`);
  }
  const pr = prName(F, ID);
  const pa = F.v('petitioner.address', ID);
  f.text('name and mailing address', pr && pa ? { value: `${pr.value}\n${oneLineAddress(pa.value).replace(/, ([^,]+, [A-Z]{2} \d{5})/, '\n$1')}`, source: `${pr.source}; ${pa.source}` } : undefined, { item: 'Name and mailing address', label: 'Personal representative name and mailing address', need: pa ? 'petitioner.name' : 'petitioner.address' });
  const dn = F.v('decedent.name', ID);
  f.text('name of decedent', dn ? { value: dn.value.toUpperCase(), source: dn.source } : undefined, { item: 'Decedent', label: 'Name of decedent', need: 'decedent.name' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text('date of death', dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: 'Decedent', label: 'Date of death', need: 'decedent.dateOfDeath' });
  f.check('real property interest yes', true, { item: 'Interest', label: 'Decedent had an interest in real property in this county: YES', source: `${p.addrSource}; ${p.countySource || F.src(`${p.key}.county`)}` });
  f.check('real property interest no', false, { item: 'Interest', label: 'NO', source: p.addrSource });
  const parts = p.parts;
  if (!parts) F.need(`${p.key}.addressParts`, ID, { label: `Street, city and ZIP of the parcel "${p.label}" (the file address could not be split)`, type: 'address' });
  f.text('street address of real property', parts ? { value: parts.street, source: p.addrSource } : undefined, { item: 'Property', label: 'Street address', need: `${p.key}.addressParts` });
  f.text('city of real property', parts ? { value: parts.city, source: p.addrSource } : undefined, { item: 'Property', label: 'City', need: `${p.key}.addressParts` });
  f.text('zip of real property', parts ? { value: parts.zip, source: p.addrSource } : undefined, { item: 'Property', label: 'ZIP', need: `${p.key}.addressParts` });
  f.text('APN of real property', p.apn ? { value: p.apn, source: p.apnSource } : undefined, { item: 'Property', label: 'APN', need: `${p.key}.apn` });
  if (!p.apn) {
    const d = F.get(`${p.key}.descriptiveAttachment`, ID, { label: 'APN unknown: which is attached? deed, tax bill, or legal description', type: 'choice', options: ['deed', 'tax bill', 'legal description'] });
    f.check('deed copy attached decedent acquired', d === undefined ? undefined : d === 'deed', { item: 'Descriptive information', label: 'Deed attached', source: F.src(`${p.key}.descriptiveAttachment`) });
    f.check('tax bill attached', d === undefined ? undefined : d === 'tax bill', { item: 'Descriptive information', label: 'Tax bill attached', source: F.src(`${p.key}.descriptiveAttachment`) });
    f.check('legal attached', d === undefined ? undefined : d === 'legal description', { item: 'Descriptive information', label: 'Legal description attached', source: F.src(`${p.key}.descriptiveAttachment`) });
  } else for (const n of ['deed copy attached decedent acquired', 'tax bill attached', 'legal attached']) f.check(n, false, { item: 'Descriptive information', label: n, source: 'APN is known (only used if APN unknown)' });
  // disposition
  let disp = F.opt('boe.disposition'); let dispSrc = F.src('boe.disposition');
  if (!disp) { const w = F.get('will.exists', ID); if (w !== undefined) { disp = w ? 'decree of distribution pursuant to will' : 'succession without a will'; dispSrc = F.src('will.exists'); } }
  const D = { 'succession without a will': 'Succession without a will', 'decree of distribution pursuant to will': 'Decree of distribution', 'probate code 13650 distribution': 'Probate Code', 'action of trustee': 'Action of trustee', 'affidavit of death of joint tenant': 'Affidavit of death' };
  for (const [k, n] of Object.entries(D)) f.check(n, disp === undefined ? undefined : disp === k, { item: 'Disposition', label: k, source: dispSrc, need: 'will.exists' });
  // transferees
  let recips;
  const same = F.get(`${p.key}.passesToHeirsInFile`, ID, { label: `Does the parcel at ${p.label} pass to the heirs in the file, in the shares recorded there?`, type: 'yesno' });
  if (same === true) recips = heirs(F, ID).filter((h) => !h.deceased).map((h) => ({ name: h.name, rel: h.relationship, pct: h.share ? `${h.share}%` : '', src: `${h.nameSource}; ${h.relSource}; case.heirs[${h.index}].sharePercentage` }));
  else if (same === false) {
    const t = F.get(`${p.key}.recipients`, ID, { label: 'Who receives this parcel? One per line or separated by ";": name, relationship, percent', type: 'text' });
    if (t) recips = String(t).split(/\n|;/).map((s) => s.trim()).filter(Boolean).map((s) => { const [name, rel, pct] = s.split(',').map((x) => (x || '').trim()); return { name, rel, pct, src: F.src(`${p.key}.recipients`) }; });
  }
  const kinds = recips ? new Set(recips.map((r) => relKind(r.rel))) : null;
  const kc = (k) => (kinds ? kinds.has(k) : undefined);
  f.check('decedents spouse', kc('spouse'), { item: 'Transfer', label: "Decedent's spouse", source: 'relationships of the recipients' });
  f.check('decedents registered domestic partner', kc('rdp'), { item: 'Transfer', label: "Decedent's registered domestic partner", source: 'relationships of the recipients' });
  f.check('decedents child or parent', kc('childParent'), { item: 'Transfer', label: "Decedent's child(ren) or parent(s)", source: 'relationships of the recipients' });
  f.check('decedents grandchild', kc('grandchild'), { item: 'Transfer', label: "Decedent's grandchild(ren)", source: 'relationships of the recipients' });
  f.check('Contenant to contenant', recips ? false : undefined, { item: 'Transfer', label: 'Cotenant to cotenant', source: 'not a cotenancy transfer in the file' });
  f.check('other beneficiaries', kc('other'), { item: 'Transfer', label: 'Other beneficiaries or heirs', source: 'relationships of the recipients' });
  f.check('A trust', recips ? false : undefined, { item: 'Transfer', label: 'A trust', source: 'recipients are individuals' });
  f.text('name of trustee', undefined, { item: 'Transfer', blankReason: 'Not a transfer to a trust' });
  f.text('address of trustee', undefined, { item: 'Transfer', blankReason: 'Not a transfer to a trust' });
  for (const [k, n1, n2, f1, f2, line] of [['childParent', "Was this the decendent's principal residence? Yes 1", "Was this the decendent's principal residence? No 1", 'Is this property a family farm? yes 1', 'Is this property a family farm? no 1', 'child/parent'], ['grandchild', "Was this the decendent's principal residence? yes 2", "Was this the decendent's principal residence? No 2", 'Is this property a family farm? yes 2', 'Is this property a family farm? no 2', 'grandchild']]) {
    if (kc(k)) {
      const pres = F.get(`${p.key}.principalResidence`, ID, { label: `Was the parcel at ${p.label} the decedent's principal residence?`, type: 'yesno' });
      const farm = F.get(`${p.key}.familyFarm`, ID, { label: `Is the parcel at ${p.label} a family farm?`, type: 'yesno' });
      f.check(n1, pres, { item: `Transfer (${line})`, label: 'Principal residence YES', source: F.src(`${p.key}.principalResidence`), need: `${p.key}.principalResidence` });
      f.check(n2, pres === undefined ? undefined : !pres, { item: `Transfer (${line})`, label: 'Principal residence NO', source: F.src(`${p.key}.principalResidence`) });
      f.check(f1, farm, { item: `Transfer (${line})`, label: 'Family farm YES', source: F.src(`${p.key}.familyFarm`), need: `${p.key}.familyFarm` });
      f.check(f2, farm === undefined ? undefined : !farm, { item: `Transfer (${line})`, label: 'Family farm NO', source: F.src(`${p.key}.familyFarm`) });
      if (pres === true) ctx.warnings.push(`A parent-child or grandparent-grandchild exclusion claim (Prop. 19) may need to be filed for ${p.label}: see the form instructions.`);
    } else for (const n of [n1, n2, f1, f2]) f.check(n, kinds ? false : undefined, { item: `Transfer (${line})`, source: kinds ? `no ${line} recipient` : 'recipients not known' });
  }
  for (let i = 1; i <= 7; i++) {
    const r = recips && recips.length <= 7 ? recips[i - 1] : undefined;
    f.text(`beneficiary name ${i}`, r ? { value: r.name, source: r.src } : undefined, { item: 'Beneficiaries', label: `Name ${i}`, blankReason: recips && recips.length > 7 ? 'See attached sheet' : (recips ? 'no more recipients' : ''), need: recips ? undefined : `${p.key}.passesToHeirsInFile` });
    f.text(`relationship ${i}`, r ? { value: r.rel, source: r.src } : undefined, { item: 'Beneficiaries', label: `Relationship ${i}`, blankReason: recips ? 'no more recipients' : '' });
    f.text(`percent received ${i}`, r && r.pct ? { value: r.pct, source: r.src } : undefined, { item: 'Beneficiaries', label: `Percent ${i}`, blankReason: r ? 'NEEDS ANSWER: share percent' : (recips ? 'no more recipients' : '') });
  }
  if (recips && recips.length > 7) ctx.warnings.push('More than 7 recipients: attach a separate sheet listing all recipients.');
  if (recips && recips.some((r) => !r.pct)) ctx.warnings.push('A recipient has no share percent in the file: complete it before filing.');
  const sold = F.get(`${p.key}.soldBeforeDistribution`, ID, { label: `Has the parcel at ${p.label} been or will it be sold before distribution?`, type: 'yesno' });
  f.check('sale prior to distribution', sold, { item: 'Sale', label: 'Sold prior to distribution', source: F.src(`${p.key}.soldBeforeDistribution`), need: `${p.key}.soldBeforeDistribution` });
  // page 2
  const le = F.get('boe.legalEntity', ID, { label: 'Will the decree of distribution include an ownership interest in any legal entity that owns real property in this county?', type: 'yesno' });
  f.check('decree includes legal entity yes 2', le, { item: 'Legal entity', label: 'YES', source: F.src('boe.legalEntity'), need: 'boe.legalEntity' });
  f.check('decree includes legal entity', le === undefined ? undefined : !le, { item: 'Legal entity', label: 'NO', source: F.src('boe.legalEntity') });
  for (const n of ['more than 50 yes', 'more than 50']) f.check(n, le === false ? false : undefined, { item: 'Legal entity', label: n, source: le === false ? 'No legal entity' : 'Complete by hand if a legal entity is distributed' });
  for (const n of ['name and address of legal entity', 'name gaining control']) f.text(n, undefined, { item: 'Legal entity', blankReason: le ? 'Complete by hand' : 'No legal entity' });
  if (le) ctx.warnings.push('Legal entity interest distributed: complete the legal entity section by hand.');
  const lease = F.get('boe.lease35', ID, { label: 'Was the decedent the lessor or lessee in a lease with an original term of 35 years or more (including renewal options)?', type: 'yesno' });
  f.check('35 year lease yes', lease, { item: 'Lease', label: 'YES', source: F.src('boe.lease35'), need: 'boe.lease35' });
  f.check('35 year lease', lease === undefined ? undefined : !lease, { item: 'Lease', label: 'NO', source: F.src('boe.lease35') });
  for (let i = 1; i <= 4; i++) for (const n of ['lease name', 'lease mail address', 'lease city', 'lease state', 'lease zip']) f.text(`${n} ${i}`, undefined, { item: 'Lease', blankReason: lease ? 'Complete by hand' : 'No long-term lease' });
  if (lease) ctx.warnings.push('Long-term lease: list the other parties to the lease by hand.');
  const tm = F.get(`${p.key}.taxMailing`, ID, { label: 'Send future property tax statements to the personal representative? (yes / give another name and address)', type: 'choice', options: ['personal representative'] });
  let tn; let ta;
  if (tm === 'personal representative' && pr && pa) { tn = pr; ta = { street: pa.value.street, city: pa.value.city, state: pa.value.state, zip: pa.value.zip, source: pa.source }; }
  f.text('Name', tn, { item: 'Tax statements', label: 'Name', need: `${p.key}.taxMailing` });
  f.text('pt mailing address', ta ? { value: ta.street, source: ta.source } : undefined, { item: 'Tax statements', label: 'Address', need: `${p.key}.taxMailing` });
  f.text('pt mailing city', ta ? { value: ta.city, source: ta.source } : undefined, { item: 'Tax statements', label: 'City', need: `${p.key}.taxMailing` });
  f.text('pt mailing state', ta ? { value: ta.state, source: ta.source } : undefined, { item: 'Tax statements', label: 'State', need: `${p.key}.taxMailing` });
  f.text('pt mailing zip', ta ? { value: ta.zip, source: ta.source } : undefined, { item: 'Tax statements', label: 'ZIP', need: `${p.key}.taxMailing` });
  // certification by the personal representative
  f.text('Printed name of wet signature spouse/registered domestic partner/personal represenatitve to the left', pr ? { value: pr.value.toUpperCase(), source: pr.source } : undefined, { item: 'Certification', label: 'Printed name', need: 'petitioner.name' });
  const cap = capacity(F, ID);
  f.text('title', cap ? { value: `Personal Representative (${cap.value})`, source: cap.source } : undefined, { item: 'Certification', label: 'Title', need: 'pr.capacity' });
  f.text('date', undefined, { item: 'Certification', label: 'Date', blankReason: 'Dated when signed' });
  const ph = F.v('petitioner.phone', ID);
  const m = ph && String(ph.value).match(/^\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})$/);
  f.text('area code', m ? { value: m[1], source: ph.source } : undefined, { item: 'Certification', label: 'Daytime area code', need: 'petitioner.phone' });
  f.text('telephone', m ? { value: `${m[2]}-${m[3]}`, source: ph.source } : undefined, { item: 'Certification', label: 'Daytime telephone', need: 'petitioner.phone' });
  f.text('email', F.opt('petitioner.email') ? F.v('petitioner.email') : undefined, { item: 'Certification', label: 'Email', blankReason: 'No email in file' });
  ctx.warnings.push('File with the Los Angeles County Assessor before or with the Inventory and Appraisal (Rev. & Tax. Code 480(b); Prob. Code 8800(d)). This statement is confidential (Rev. & Tax. Code 481).');
  void S;
}

module.exports = {
  id: ID, kind: 'jc', title: 'Change in Ownership Statement, Death of Real Property Owner (Los Angeles County)', revision: 'BOE-502-D REV. 15 (07-25), ASSR-176 (REV. 10-25)', template: 'BOE-502-D-LA.pdf',
  sourceUrl: 'https://res.cloudinary.com/los-angeles-county-assessor/image/upload/v1622784606/Form/BOE-502-D.pdf', procedures: ['full', '13151', '13200', '13650'], confidential: true, records, fill,
};
