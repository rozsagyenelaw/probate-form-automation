// Heirs and beneficiaries from the case file, with full mailing addresses (report D4: the old
// generator cut addresses to the street line).
const { fullName, oneLineAddress, addressComplete, S } = require('./facts');

function heirs(F, form) {
  const list = Array.isArray(F.caseData.heirs) ? F.caseData.heirs : [];
  return list.map((h, i) => {
    const name = fullName(h) || S(h.name);
    const key = `heir.${i + 1}`;
    let address = '';
    let addrSource = '';
    const ans = F.opt(`${key}.address`);
    if (ans) { address = typeof ans === 'string' ? ans : oneLineAddress(ans); addrSource = F.src(`${key}.address`); }
    else if (h.isDeceased) { address = 'Deceased'; addrSource = `case.heirs[${i}].isDeceased`; }
    else if (addressComplete(h.address)) { address = oneLineAddress(h.address); addrSource = `case.heirs[${i}].address`; }
    else F.need(`${key}.address`, form, { label: `Full mailing address (street, city, state, ZIP) of ${name || `heir ${i + 1}`}`, type: 'address' });
    let age = '';
    let ageSource = '';
    const ageAns = F.opt(`${key}.age`);
    if (ageAns) { age = String(ageAns); ageSource = F.src(`${key}.age`); }
    else if (h.isDeceased) { age = ''; }
    else if (/^adult$/i.test(S(h.age))) { age = 'Adult'; ageSource = `case.heirs[${i}].age`; }
    else if (/^\d+$/.test(S(h.age))) { age = S(h.age); ageSource = `case.heirs[${i}].age`; }
    else F.need(`${key}.age`, form, { label: `Age of ${name || `heir ${i + 1}`} (a minor's exact age is required)`, type: 'text' });
    return {
      index: i, key, name, nameSource: `case.heirs[${i}].firstName/lastName`,
      relationship: S(h.relationship), relSource: `case.heirs[${i}].relationship`,
      age, ageSource, address, addrSource,
      deceased: !!h.isDeceased, adult: /^adult$/i.test(S(h.age)) || (/^\d+$/.test(S(h.age)) && Number(h.age) >= 18),
      waivedBond: h.waivedBond === true, share: S(h.sharePercentage),
      raw: h,
    };
  });
}

module.exports = { heirs };
