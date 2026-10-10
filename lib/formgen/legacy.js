// Maps the old generator questionnaire (snake_case fields from index.html / form.html and the
// main-site admin "Auto Generate" link) onto the engine. Every value becomes an answer with the
// source "Generator questionnaire"; nothing is assumed (the old code defaulted residence, bond,
// IAEA and self-proving answers and invented a hearing).
const SRC = 'Generator questionnaire (process-form)';
function yn(v) { if (v === 'yes' || v === true) return true; if (v === 'no' || v === false) return false; return undefined; }
function legacyToEngine(w = {}) {
  const a = {};
  const put = (k, v) => { if (v !== undefined && v !== null && v !== '') a[k] = { value: v, source: SRC }; };
  put('decedent.name', w.decedent_name);
  put('decedent.dateOfDeath', w.death_date);
  put('decedent.placeOfDeath', w.death_place);
  put('decedent.residence', w.death_address);
  put('decedent.caResident', yn(w.death_resident));
  put('petitioner.name', w.petitioner_name);
  put('petitioner.relationship', w.petitioner_relationship);
  put('petitioner.address', w.petitioner_address);
  put('petitioner.phone', w.petitioner_phone);
  if (yn(w.has_will) !== undefined) put('will.exists', yn(w.has_will));
  put('will.date', w.will_date);
  put('will.selfProving', yn(w.will_self_proving));
  if (yn(w.executor_named_in_will) !== undefined || yn(w.petitioner_is_executor) !== undefined) put('petitioner.isNamedExecutor', yn(w.petitioner_is_executor));
  put('family.spouseSurvived', yn(w.has_spouse));
  put('family.childSurvived', yn(w.has_children));
  put('estate.personalProperty', w.personal_property_value);
  put('estate.realGross', w.real_property_gross);
  put('estate.realEncumbrances', w.real_property_encumbrance);
  if (w.real_property_gross !== undefined && w.real_property_gross !== '') put('estate.hasRealProperty', Number(String(w.real_property_gross).replace(/[^0-9.]/g, '')) > 0);
  if (w.admin_type) put('petition.iaeaAuthority', w.admin_type);
  if (yn(w.bond_required) === false) put('will.waivesBond', true);
  if (yn(w.bond_required) === true) { put('will.waivesBond', false); put('petition.bondAmount', w.bond_amount); }
  put('court.county', w.court_county);
  // heirs: either heirs_list "name, relationship, age, street, city, state zip" lines or heir_*_N fields
  const heirs = [];
  if (typeof w.heirs_list === 'string') {
    for (const line of w.heirs_list.split('\n').filter((l) => l.trim())) {
      const parts = line.split(',').map((s) => s.trim());
      heirs.push({ name: parts[0], relationship: parts[1] || '', age: parts[2] || '', address: parts.slice(3).join(', ') });
    }
  }
  for (const k of Object.keys(w)) {
    const m = /^heir_name_(\d+)$/.exec(k);
    if (m) heirs.push({ name: w[k], relationship: w[`heir_relationship_${m[1]}`] || '', age: w[`heir_age_${m[1]}`] || '', address: w[`heir_address_${m[1]}`] || '' });
  }
  const caseData = { heirs: heirs.map((h) => ({ firstName: h.name, lastName: '', relationship: h.relationship, age: /^adult$/i.test(h.age) ? 'Adult' : h.age })) };
  heirs.forEach((h, i) => { if (h.address) a[`heir.${i + 1}.address`] = { value: h.address, source: SRC }; if (h.age && !/^adult$/i.test(h.age)) a[`heir.${i + 1}.age`] = { value: h.age, source: SRC }; });
  // decedent.name via answers needs a catalogue-free path: facts reads answers first
  return { caseData, answers: a };
}
module.exports = { legacyToEngine };
