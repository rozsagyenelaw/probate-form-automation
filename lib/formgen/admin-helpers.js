// Helpers for the administration and closing forms (DE-157, DE-160/161, DE-165, DE-174,
// BOE-502-D, 9202 notices). Values come only from the case file or Rozsa's answers.
const { S, has, oneLineAddress, addressComplete } = require('./facts');
const { num } = require('./format');

// Known creditors: intake liabilities plus any filed claims recorded by the cockpit.
// The creditor's mailing address is never in intake, so it is always an attorney answer.
function creditors(F, form) {
  const out = [];
  const libs = Array.isArray(F.caseData.liabilities) ? F.caseData.liabilities : [];
  libs.forEach((l, i) => { if (has(l.creditorName)) out.push({ key: `creditor.${i + 1}`, name: S(l.creditorName), nameSource: `case.liabilities[${i}].creditorName`, account: S(l.accountNumber), amount: l.amountOwed, amountSource: `case.liabilities[${i}].amountOwed` }); });
  const claims = Array.isArray(F.caseData.creditorClaims) ? F.caseData.creditorClaims : [];
  claims.forEach((c, i) => {
    const name = S(c.claimantName);
    if (!name || out.some((o) => o.name.toLowerCase() === name.toLowerCase())) return;
    out.push({ key: `claimant.${i + 1}`, name, nameSource: `case.creditorClaims[${i}].claimantName`, account: '', amount: c.amountClaimed, amountSource: `case.creditorClaims[${i}].amountClaimed`, address: c.claimantAddress });
  });
  for (const c of out) {
    const ans = F.opt(`${c.key}.address`);
    if (ans) { c.address = typeof ans === 'string' ? ans : oneLineAddress(ans); c.addrSource = F.src(`${c.key}.address`); }
    else if (addressComplete(c.address)) { c.addrSource = c.nameSource.replace('claimantName', 'claimantAddress'); c.address = oneLineAddress(c.address); }
    else if (typeof c.address === 'string' && c.address.trim()) { c.addrSource = c.nameSource.replace('claimantName', 'claimantAddress'); }
    else { c.address = ''; F.need(`${c.key}.address`, form, { label: `Mailing address of creditor ${c.name}`, type: 'address' }); }
  }
  return out;
}

// Split an intake address string "100 Example Ave., Burbank, CA 91501" into parts.
function splitAddress(str) {
  const m = String(str || '').match(/^\s*(.+?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/i);
  if (!m) return null;
  return { street: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), zip: m[4] };
}

// Real property records with the county where each parcel sits. The county is only derived when
// the parcel address is the decedent's residence address in the file; otherwise it is asked.
function parcels(F, form) {
  const rp = Array.isArray(F.caseData.assets && F.caseData.assets.realProperty) ? F.caseData.assets.realProperty : [];
  const res = F.caseData.decedent && F.caseData.decedent.lastAddress;
  return rp.map((p, i) => {
    const key = `realProperty.${p.id || i + 1}`;
    const parts = splitAddress(p.address);
    let county = F.opt(`${key}.county`); let countySource = F.src(`${key}.county`);
    if (!county && parts && res && S(res.street) && parts.street.toLowerCase() === S(res.street).toLowerCase() && S(res.county)) {
      county = S(res.county).replace(/\s+county$/i, ''); countySource = `case.decedent.lastAddress.county (parcel address is the residence address)`;
    }
    return { index: i, key, raw: p, address: S(p.address), addrSource: `case.assets.realProperty[${i}].address`, parts, apn: S(p.apn), apnSource: `case.assets.realProperty[${i}].apn`, type: S(p.propertyType), county, countySource, label: S(p.address) || `Parcel ${i + 1}` };
  });
}

// Inventory items. Attachment 1 (cash items appraised by the personal representative,
// Prob. Code 8901; DE-160 instruction 3): bank-type accounts. Attachment 2 (probate referee,
// 8902): everything else. The client's intake estimate is never printed as an appraisal.
const CASH_TYPES = /checking|savings|money market|certificate of deposit/i;
// Which procedure the inventory is for: 13151 inventories only the primary residence (Prob. Code
// 13152(b), DE-310 item 8); 13200 only California real property (13200(c)); full probate everything.
function inventoryScope(F) {
  const st = String(F.caseData.serviceType || '').toLowerCase();
  if (/simplif|13151|residence|succession/.test(st)) return '13151';
  if (/13200|small.?real/.test(st) || (/small/.test(st) && ((F.caseData.assets || {}).realProperty || []).length)) return '13200';
  return 'full';
}
function inventoryItems(F) {
  const a = F.caseData.assets || {};
  const items = [];
  const scope = inventoryScope(F);
  const realDesc = (x) => {
    const interest = F.opt('property.decedentInterest');
    const ld = F.opt('property.legalDescription');
    return `${interest ? `The decedent's ${interest} in the ` : ''}${interest ? 'real' : 'Real'} property${x.propertyType ? ` (${S(x.propertyType)})` : ''} commonly known as ${S(x.address)}${x.apn ? `, Assessor's Parcel No. ${S(x.apn)}` : ''}${ld ? `, legally described as: ${ld}` : ''}`;
  };
  if (scope !== 'full') {
    let rp = a.realProperty || [];
    if (scope === '13151') { const r = require('./smallestate').residenceParcel(F, 'DE-160'); rp = r ? [r.p] : []; }
    rp.forEach((x, i) => items.push({ id: x.id || `rp${i + 1}`, att: 2, description: realDesc(x), source: `case.assets.realProperty (${scope === '13151' ? 'primary residence only, Prob. Code 13152(b)' : 'California real property only, Prob. Code 13200(c)'})` }));
    return items;
  }
  (a.financialAccounts || []).forEach((x, i) => items.push({
    id: x.id || `fa${i + 1}`, att: CASH_TYPES.test(S(x.accountType)) ? 1 : 2,
    description: `${S(x.institutionName)}${x.accountType ? `, ${S(x.accountType)}` : ''}${x.accountNumber ? `, account ending ${S(x.accountNumber).replace(/.*(\d{4})$/, '$1')}` : ''}`,
    source: `case.assets.financialAccounts[${i}]`, ownership: S(x.ownershipType),
  }));
  (a.realProperty || []).forEach((x, i) => items.push({ id: x.id || `rp${i + 1}`, att: 2, description: realDesc(x), source: `case.assets.realProperty[${i}]` }));
  (a.vehicles || []).forEach((x, i) => items.push({ id: x.id || `v${i + 1}`, att: 2, description: `${[x.year, x.make, x.model].map(S).filter(Boolean).join(' ')} automobile${x.vin ? `, VIN ${S(x.vin)}` : ''}${x.licensePlate ? `, license ${S(x.licensePlate)}` : ''}`, source: `case.assets.vehicles[${i}]` }));
  (a.personalProperty || []).forEach((x, i) => items.push({ id: x.id || `pp${i + 1}`, att: 2, description: `${S(x.description)}${x.location ? ` (located at ${S(x.location)})` : ''}`, source: `case.assets.personalProperty[${i}]` }));
  return items;
}

module.exports = { creditors, splitAddress, parcels, inventoryItems, inventoryScope, num };
