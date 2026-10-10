// Helper for generated documents (pleadings, letters, affidavits): every value used is recorded
// as an editable field {field, item, label, value, source}. A value that is not in the file is
// printed as a visible "[ANSWER NEEDED: ...]" marker and listed in the needs.
const { fmtDate, longDate, money } = require('./format');

function docFields(F, formId) {
  const fields = [];
  const seen = new Set();
  const rec = (key, label, value, source, item) => {
    if (seen.has(key)) return;
    seen.add(key);
    fields.push({ field: key, type: 'text', item: item || '', label, value: value === undefined ? '' : String(value), source: value === undefined ? `NEEDS ANSWER: ${key}` : source });
  };
  const api = {
    fields,
    // raw value or undefined (records a need)
    raw(key, opts = {}) {
      const v = F.get(key, formId, opts);
      rec(key, opts.label || key, v === undefined ? undefined : (opts.show ? opts.show(v) : v), F.src(key), opts.item);
      return v;
    },
    // printable text: the value formatted, or an [ANSWER NEEDED] marker
    t(key, opts = {}) {
      const v = api.raw(key, opts);
      if (v === undefined) return `[ANSWER NEEDED: ${opts.short || opts.label || key}]`;
      if (opts.date) return longDate(v);
      if (opts.mdy) return fmtDate(v);
      if (opts.money) return `$${money(v)}`;
      return String(v);
    },
    // record a computed value
    calc(key, label, value, source, item) { rec(key, label, value, source, item); return value; },
  };
  return api;
}

module.exports = { docFields };
