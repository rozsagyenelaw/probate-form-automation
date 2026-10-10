// Fact catalogue and resolver.
//
// Rule (build order item 61): never fill a fact that is not in the file. Every value a form
// prints comes from (1) Rozsa's own answer to a "needs your answer" question, stored in
// formAnswers, or (2) a field the client entered in intake / the case record, with its path as
// the source, or (3) arithmetic on those values. Anything else is reported as a need and the
// form field is left blank.

const { fmtDate, isoDate, money, num } = require('./format');

const S = (v) => (v === undefined || v === null ? '' : String(v)).trim();
const has = (v) => !(v === undefined || v === null || (typeof v === 'string' && v.trim() === ''));

function fullName(p) {
  if (!p) return '';
  return [p.firstName, p.middleName, p.lastName].map(S).filter(Boolean).join(' ');
}
function oneLineAddress(a) {
  if (!a) return '';
  if (typeof a === 'string') return a.trim();
  const cityLine = [S(a.city), [S(a.state), S(a.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [S(a.street), cityLine].filter(Boolean).join(', ');
}
function addressComplete(a) {
  return a && typeof a === 'object' && has(a.street) && has(a.city) && has(a.state) && has(a.zip);
}
function first(c, paths) {
  for (const p of paths) {
    const v = p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c);
    if (has(v)) return { value: v, source: `case.${p}` };
  }
  return undefined;
}
function yn(v) {
  if (v === true || v === 'yes' || v === 'Yes' || v === 'true') return true;
  if (v === false || v === 'no' || v === 'No' || v === 'false') return false;
  return undefined;
}
function normCounty(s) {
  return S(s).replace(/\s+county$/i, '').trim();
}

// key -> { label (question shown to Rozsa), type, options?, from(caseData) -> {value, source} | undefined }
const CATALOGUE = {
  // ---------- Decedent ----------
  'decedent.name': { label: 'Decedent full legal name', type: 'text',
    from: (c) => { const n = fullName(c.decedent); return n ? { value: n, source: 'case.decedent.firstName/middleName/lastName' } : undefined; } },
  'decedent.aka': { label: 'Other names the decedent used (aka), or "none"', type: 'text' },
  'decedent.dateOfDeath': { label: 'Date of death', type: 'date', from: (c) => first(c, ['decedent.dateOfDeath']) },
  'decedent.placeOfDeath': { label: 'Place of death (city, state, or facility)', type: 'text', from: (c) => first(c, ['decedent.placeOfDeath']) },
  'decedent.dateOfBirth': { label: 'Decedent date of birth', type: 'date', from: (c) => first(c, ['decedent.dateOfBirth']) },
  'decedent.ssnLast4': { label: 'Last 4 digits of decedent SSN', type: 'text', from: (c) => first(c, ['decedent.ssnLast4']) },
  'decedent.residence': { label: 'Decedent residence at death (street, city, state, ZIP)', type: 'address',
    from: (c) => { const a = c.decedent && c.decedent.lastAddress; return addressComplete(a) ? { value: a, source: 'case.decedent.lastAddress' } : undefined; } },
  'decedent.residenceCounty': { label: 'County of decedent residence at death', type: 'text',
    from: (c) => { const v = first(c, ['decedent.lastAddress.county', 'filingCounty']); return v ? { value: normCounty(v.value), source: v.source } : undefined; } },
  'decedent.caResident': { label: 'Was the decedent a resident (domiciled) in California at death?', type: 'yesno',
    from: (c) => { const st = S(c.decedent && c.decedent.lastAddress && c.decedent.lastAddress.state).toUpperCase(); if (!st) return undefined; return { value: st === 'CA' || st === 'CALIFORNIA', source: 'case.decedent.lastAddress.state' }; } },
  'decedent.foreignCitizen': { label: 'Was the decedent a citizen of a country other than the United States?', type: 'yesno',
    from: (c) => { const v = S(c.decedent && c.decedent.citizenship); if (!v) return undefined; return { value: v !== 'US', source: 'case.decedent.citizenship' }; } },
  'decedent.citizenshipCountry': { label: 'Country of citizenship (if not the United States)', type: 'text' },
  'decedent.maritalStatus': { label: 'Decedent marital status at death', type: 'choice', options: ['married', 'registered domestic partner', 'widowed', 'divorced', 'never married'],
    from: (c) => { const v = S(c.decedent && c.decedent.maritalStatus).toLowerCase(); if (!v) return undefined; const map = { married: 'married', widowed: 'widowed', divorced: 'divorced', single: 'never married', 'never married': 'never married', 'domestic partner': 'registered domestic partner', 'registered domestic partner': 'registered domestic partner' }; return map[v] ? { value: map[v], source: 'case.decedent.maritalStatus' } : undefined; } },

  // ---------- Petitioner ----------
  'petitioner.name': { label: 'Petitioner full name', type: 'text',
    from: (c) => { const n = fullName(c.petitioner); return n ? { value: n, source: 'case.petitioner.firstName/lastName' } : undefined; } },
  'petitioner.address': { label: 'Petitioner mailing address (street, city, state, ZIP)', type: 'address',
    from: (c) => { const a = c.petitioner && c.petitioner.address; return addressComplete(a) ? { value: a, source: 'case.petitioner.address' } : undefined; } },
  'petitioner.phone': { label: 'Petitioner phone', type: 'text', from: (c) => first(c, ['petitioner.phone']) },
  'petitioner.email': { label: 'Petitioner email', type: 'text', from: (c) => first(c, ['petitioner.email']) },
  'petitioner.relationship': { label: 'Petitioner relationship to decedent', type: 'text', from: (c) => first(c, ['petitioner.relationship']) },
  'petitioner.caResident': { label: 'Is the proposed personal representative a California resident?', type: 'yesno',
    from: (c) => { const v = yn(c.petitioner && c.petitioner.isCAResident); return v === undefined ? undefined : { value: v, source: 'case.petitioner.isCAResident' }; } },
  'petitioner.usResident': { label: 'Is the proposed personal representative a resident of the United States?', type: 'yesno' },
  'petitioner.isNamedExecutor': { label: 'Is the petitioner the executor named in the will, and does the petitioner consent to act?', type: 'yesno',
    from: (c) => { const ne = S(c.namedExecutor).toLowerCase().replace(/\s+/g, ' '); const pn = fullName(c.petitioner).toLowerCase().replace(/\s+/g, ' '); if (!ne || !pn) return undefined; if (ne === pn) return { value: true, source: 'case.namedExecutor equals case.petitioner name' }; return undefined; } },
  'petitioner.isEntitledToLetters': { label: 'Intestate case: is the petitioner a person entitled to Letters (Prob. Code 8461)?', type: 'yesno' },

  // ---------- Will ----------
  'will.exists': { label: 'Did the decedent leave a will?', type: 'yesno',
    from: (c) => { const v = yn(c.willExists); return v === undefined ? undefined : { value: v, source: 'case.willExists' }; } },
  'will.date': { label: 'Date of the will', type: 'date', from: (c) => first(c, ['willDate']) },
  'will.codicilDates': { label: 'Dates of each codicil (or "none")', type: 'text',
    from: (c) => { if (yn(c.codicilExists) === false) return { value: 'none', source: 'case.codicilExists' }; const v = c.codicilDates; if (Array.isArray(v) && v.length) return { value: v.map(fmtDate).join(', '), source: 'case.codicilDates' }; if (has(v)) return { value: S(v), source: 'case.codicilDates' }; return undefined; } },
  'will.selfProving': { label: 'Are the will and all codicils self-proving (Prob. Code 8220)?', type: 'yesno' },
  'will.waivesBond': { label: 'Does the will waive bond?', type: 'yesno',
    from: (c) => { const v = yn(c.bondWaivedInWill); return v === undefined ? undefined : { value: v, source: 'case.bondWaivedInWill' }; } },
  'will.executorName': { label: 'Executor named in the will', type: 'text', from: (c) => first(c, ['namedExecutor']) },
  'will.otherExecutorsNotActing': { label: 'Are there other named executors who will not act? If yes, why (death, declination, other)? Answer "no" if none.', type: 'text' },
  'will.precludesIAEA': { label: 'Does the will preclude administration under the Independent Administration of Estates Act?', type: 'yesno' },
  'will.lost': { label: 'Has the original will been lost?', type: 'yesno' },
  'will.custodianName': { label: 'Name of the person who has custody of the original will', type: 'text' },
  'will.custodianAddress': { label: 'Address of the custodian of the original will', type: 'text' },
  'will.knowledgeOfDeathDate': { label: 'Date the custodian learned of the death (Prob. Code 8200: lodge within 30 days)', type: 'date' },

  // ---------- Petition choices ----------
  'petition.iaeaAuthority': { label: 'Independent administration requested: full, limited, or none', type: 'choice', options: ['full', 'limited', 'none'] },
  'petition.newspaper': { label: 'Newspaper for publication (adjudicated newspaper of general circulation in the city of residence, Prob. Code 8121)', type: 'text' },
  'petition.publicationArranged': { label: 'Publication: requested from the court (a) or arranged by petitioner (b)?', type: 'choice', options: ['requested', 'arranged'] },
  'petition.bondAmount': { label: 'Bond amount to request (or 0 if bond is waived)', type: 'money' },
  'petition.blockedAccount': { label: 'Amount and institution/location for any blocked account (or "none")', type: 'text' },

  // ---------- Family (DE-111 items 5 to 7, DE-310, DE-221) ----------
  'family.spouseSurvived': { label: 'Was the decedent survived by a spouse?', type: 'yesno',
    from: (c) => { const v = yn(c.survivedBySpouse); return v === undefined ? undefined : { value: v, source: 'case.survivedBySpouse' }; } },
  'family.noSpouseReason': { label: 'No surviving spouse because: divorced or never married, or spouse deceased?', type: 'choice', options: ['divorced or never married', 'spouse deceased'] },
  'family.rdpSurvived': { label: 'Was the decedent survived by a registered domestic partner?', type: 'yesno' },
  'family.childSurvived': { label: 'Was the decedent survived by a child?', type: 'yesno',
    from: (c) => { const v = yn(c.survivedByChildren); return v === undefined ? undefined : { value: v, source: 'case.survivedByChildren' }; } },
  'family.childType': { label: 'Surviving children are: natural or adopted; natural adopted by a third party; or both', type: 'choice', options: ['natural or adopted', 'natural adopted by a third party', 'both'] },
  'family.issueOfPredeceasedChild': { label: 'Was the decedent survived by issue (children, grandchildren) of a predeceased child?', type: 'yesno' },
  'family.stepchild': { label: 'Was the decedent survived by a stepchild or foster child who would have been adopted but for a legal barrier (Prob. Code 6454)?', type: 'yesno' },
  'family.item6': { label: 'DE-111 item 6 (only if no issue survived): first box that applies (a parents, b issue of parents, c grandparents, d issue of grandparents, e issue of predeceased spouse, f next of kin, g parents of predeceased spouse, h no known next of kin)', type: 'choice', options: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
  'family.item7': { label: 'DE-111 item 7 (only if no spouse or issue survived): a no predeceased spouse; b(1), b(2), or b(3) with the sub-box', type: 'text' },
  'family.heirsListComplete': { label: 'Does the heirs list in the file include every person named in the will or codicils (living or deceased) and every heir? (DE-111 item 8)', type: 'yesno' },

  // ---------- Estate values ----------
  'estate.personalProperty': { label: 'Estimated value of personal property', type: 'money',
    from: (c) => sumPersonal(c) },
  'estate.incomeReal': { label: 'Annual gross income from real property (rents), or 0', type: 'money' },
  'estate.incomePersonal': { label: 'Annual gross income from personal property (interest, dividends), or 0', type: 'money' },
  'estate.realGross': { label: 'Gross fair market value of real property', type: 'money',
    from: (c) => { const rp = (c.assets && c.assets.realProperty) || []; if (!rp.length) return undefined; if (rp.some((p) => !has(p.estimatedValue))) return undefined; return { value: rp.reduce((s, p) => s + num(p.estimatedValue), 0), source: 'sum of case.assets.realProperty[].estimatedValue' }; } },
  'estate.realEncumbrances': { label: 'Encumbrances on real property (mortgages, liens)', type: 'money',
    from: (c) => { const rp = (c.assets && c.assets.realProperty) || []; if (!rp.length) return undefined; return { value: rp.reduce((s, p) => s + num(p.mortgageBalance), 0), source: 'sum of case.assets.realProperty[].mortgageBalance (blank = 0)' }; } },
  'estate.hasRealProperty': { label: 'Does the estate include California real property?', type: 'yesno',
    from: (c) => { const rp = c.assets && c.assets.realProperty; if (!Array.isArray(rp)) return undefined; return { value: rp.length > 0, source: 'case.assets.realProperty (count)' }; } },
  'estate.realProperty': { label: 'Real property list', type: 'list',
    from: (c) => { const rp = (c.assets && c.assets.realProperty) || []; return rp.length ? { value: rp, source: 'case.assets.realProperty' } : undefined; } },

  // ---------- Court and case (court fields are entered by Rozsa in the admin cockpit) ----------
  'court.county': { label: 'County of the superior court', type: 'text',
    from: (c) => { const v = first(c, ['court.county', 'filingCounty', 'decedent.lastAddress.county']); return v ? { value: normCounty(v.value), source: v.source } : undefined; } },
  'court.courthouse': { label: 'Courthouse where the case is filed', type: 'text',
    from: (c) => first(c, ['court.courthouse']) },
  'case.number': { label: 'Case number', type: 'text', from: (c) => first(c, ['court.caseNumber', 'caseNumber']) },
  // hearing on the petition: latest cockpit hearings[] entry of type 'petition', else legacy fields
  'hearing.date': { label: 'Hearing date', type: 'date', from: (c) => hearingOf(c, 'petition', 'date') || first(c, ['keyDates.firstHearing', 'hearing.date', 'hearingDetails.date']) },
  'hearing.time': { label: 'Hearing time', type: 'text', from: (c) => hearingOf(c, 'petition', 'time') || first(c, ['hearing.time', 'hearingDetails.time']) },
  'hearing.dept': { label: 'Department', type: 'text', from: (c) => hearingOf(c, 'petition', 'department') || first(c, ['court.department', 'hearing.department', 'hearingDetails.department']) },
  'hearing.room': { label: 'Room', type: 'text', from: (c) => first(c, ['court.room']) },
  'final.hearingDate': { label: 'Hearing date on the petition for final distribution', type: 'date', from: (c) => hearingOf(c, 'final', 'date') || first(c, ['keyDates.finalHearing', 'finalPetition.hearingDate']) },
  'final.hearingTime': { label: 'Hearing time on the petition for final distribution', type: 'text', from: (c) => hearingOf(c, 'final', 'time') },
  'letters.date': { label: 'Date Letters first issued', type: 'date', from: (c) => first(c, ['keyDates.lettersIssued', 'letters.issuedDate']) },
  'final.ftbNoticeDate': { label: 'Date FTB notice given (9202(c))', type: 'date', from: (c) => first(c, ['keyDates.ftbNoticeSent']) },
  'final.publicationProofDate': { label: 'Date proof of publication was filed', type: 'date' },
  'will.lodgedDate': { label: 'Date the original will was lodged with the court', type: 'date', from: (c) => first(c, ['keyDates.willLodged']) },
  'pr.name': { label: 'Name of the personal representative appointed', type: 'text' },
  'pr.capacity': { label: 'Capacity of the personal representative: executor, administrator with will annexed, administrator, special administrator', type: 'choice', options: ['executor', 'administrator with will annexed', 'administrator', 'special administrator'] },
};

function hearingOf(c, type, field) {
  const hs = Array.isArray(c.hearings) ? c.hearings.filter((h) => h && h.type === type && h.date) : [];
  if (!hs.length) return undefined;
  const h = hs.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const v = h[field];
  if (v === undefined || v === null || v === '') return undefined;
  if (field === 'time' && /^\d{2}:\d{2}$/.test(v)) {
    const [H, M] = v.split(':').map(Number);
    return { value: `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${H < 12 ? 'a.m.' : 'p.m.'}`, source: `case.hearings[type=${type}].time` };
  }
  return { value: v, source: `case.hearings[type=${type}].${field}` };
}

function sumPersonal(c) {
  const a = c.assets || {};
  const lists = [
    ['financialAccounts', 'estimatedValue'],
    ['vehicles', 'estimatedValue'],
    ['personalProperty', 'estimatedValue'],
    // older intake shapes, kept in case a record still has them
    ['bankAccounts', 'balance'],
    ['investments', 'value'],
    ['otherAssets', 'estimatedValue'],
  ];
  let total = 0; let any = false; let missing = false; const used = [];
  for (const [k, f] of lists) {
    const arr = Array.isArray(a[k]) ? a[k] : [];
    if (!arr.length) continue;
    used.push(`${k}[].${f}`);
    for (const it of arr) { any = true; if (!has(it[f])) missing = true; total += num(it[f]); }
  }
  if (!any || missing) return undefined;
  return { value: total, source: `sum of case.assets.${used.join(' + ')}` };
}

function makeFacts(caseData = {}, answers = {}) {
  const needs = new Map();
  const cache = {};
  function resolve(key) {
    if (key in cache) return cache[key];
    let r;
    const ans = answers[key];
    const ansVal = ans && typeof ans === 'object' && 'value' in ans ? ans.value : ans;
    if (has(ansVal) || ansVal === false || ansVal === 0) r = { value: ansVal, source: (ans && typeof ans === 'object' && ans.source) || 'Answer saved in the case (formAnswers)' };
    else {
      const def = CATALOGUE[key];
      if (def && def.from) { try { r = def.from(caseData); } catch (e) { r = undefined; } }
    }
    cache[key] = r;
    return r;
  }
  const api = {
    caseData,
    // value or undefined; records a need when missing
    get(key, form, opts = {}) {
      const r = resolve(key);
      if (r === undefined || r.value === undefined) { api.need(key, form, opts); return undefined; }
      return r.value;
    },
    // like get, but returns {value, source}
    v(key, form, opts) { const val = api.get(key, form, opts); return val === undefined ? undefined : { value: val, source: resolve(key).source, key }; },
    // optional fact: never records a need
    opt(key) { const r = resolve(key); return r ? r.value : undefined; },
    src(key) { const r = resolve(key); return r ? r.source : ''; },
    has(key) { const r = resolve(key); return !!r && r.value !== undefined; },
    need(key, form, opts = {}) {
      const def = CATALOGUE[key] || {};
      const n = needs.get(key) || { key, question: opts.label || def.label || key, type: opts.type || def.type || 'text', options: opts.options || def.options, forms: [] };
      if (form && !n.forms.includes(form)) n.forms.push(form);
      needs.set(key, n);
    },
    needs() { return [...needs.values()]; },
  };
  return api;
}

module.exports = { CATALOGUE, makeFacts, fullName, oneLineAddress, addressComplete, has, yn, S };
