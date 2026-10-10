// Court block by county (and, in Los Angeles, by courthouse). Every entry records the court
// web page it was verified from. A county or courthouse that is not in this table is never
// guessed: the form leaves the court block blank and asks Rozsa.
const COURTS = require('./courts-data.json');

function norm(s) { return String(s || '').replace(/\s+county$/i, '').trim().toLowerCase(); }

function courtFor(F, form) {
  const countyV = F.v('court.county', form);
  if (!countyV) return { need: 'court.county' };
  const entry = COURTS.counties[norm(countyV.value)];
  const county = countyV.value.replace(/\s+county$/i, '').trim();
  if (!entry) {
    F.need('court.address', form, { label: `Court street, mailing address, city/ZIP and branch for ${county} County (not yet verified in the generator)`, type: 'text' });
    return { county, countySource: countyV.source, need: 'court.address' };
  }
  let ch;
  if (entry.courthouses.length === 1) ch = entry.courthouses[0];
  else {
    const pick = F.opt('court.courthouse');
    const pk = String(pick || '').toLowerCase().replace(/[^a-z]/g, '');
    ch = pick && entry.courthouses.find((c) => c.key === pick || c.branch.toLowerCase().replace(/[^a-z]/g, '').includes(pk) || pk.includes(c.branch.toLowerCase().replace(/courthouse/, '').replace(/[^a-z]/g, '')));
    // a county whose rule makes one courthouse always available (LASC: Central) uses it unless
    // Rozsa picks the other
    if (!ch && entry.default) {
      ch = entry.courthouses.find((c) => c.key === entry.default);
      if (ch) return { county: countyV.value.replace(/\s+county$/i, '').trim(), countySource: countyV.source, street: ch.street, mailing: ch.mailing, cityZip: ch.cityZip, branch: ch.branch, source: `${entry.rule}; ${ch.verifiedFrom} (opened ${ch.verifiedOn})` };
    }
    if (!ch) {
      F.need('court.courthouse', form, { label: `Which ${county} County courthouse will hear this probate case? (${entry.rule || ''})`, type: 'choice', options: entry.courthouses.map((c) => c.key) });
      return { county, countySource: countyV.source, need: 'court.courthouse' };
    }
  }
  return {
    county, countySource: countyV.source,
    street: ch.street, mailing: ch.mailing || ch.street, cityZip: ch.cityZip, branch: ch.branch,
    source: `${ch.verifiedFrom} (opened ${ch.verifiedOn})`,
  };
}

module.exports = { courtFor, COURTS };
