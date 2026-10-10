// Shared case logic used by several forms.

// Capacity of the personal representative, from the file only:
// executor (will, petitioner is the named executor), administrator with will annexed (will,
// petitioner is not the named executor), administrator (no will). An attorney answer to
// pr.capacity always wins (e.g. after the court's order).
function capacity(F, form) {
  const ans = F.opt('pr.capacity');
  if (ans) return { value: ans, source: F.src('pr.capacity') };
  const will = F.get('will.exists', form);
  if (will === false) return { value: 'administrator', source: F.src('will.exists') };
  if (will === true) {
    const ex = F.get('petitioner.isNamedExecutor', form);
    if (ex === true) return { value: 'executor', source: `${F.src('will.exists')}; ${F.src('petitioner.isNamedExecutor')}` };
    if (ex === false) return { value: 'administrator with will annexed', source: `${F.src('will.exists')}; ${F.src('petitioner.isNamedExecutor')}` };
  }
  return undefined;
}

// Name of the personal representative: the court-appointed name if recorded, else the petitioner.
function prName(F, form) {
  const n = F.opt('pr.name');
  if (n) return { value: n, source: F.src('pr.name') };
  return F.v('petitioner.name', form);
}

// Bond (Prob. Code 8480, 8481): not required when the will waives it, or when every heir or
// beneficiary is an adult who has waived it (DE-142). Returns {required, reason, source}.
function bondStatus(F, form) {
  const { heirs } = require('./people');
  const will = F.get('will.exists', form);
  if (will === undefined) return { required: undefined };
  const waives = will ? F.get('will.waivesBond', form) : false;
  if (waives === true) return { required: false, reason: '3e1', source: F.src('will.waivesBond') };
  const hs = heirs(F, form).filter((h) => !h.deceased);
  if (hs.length && hs.every((h) => h.waivedBond && h.adult)) return { required: false, reason: will ? '3e2' : '3e3', source: 'case.heirs[].waivedBond (every adult heir)' };
  if (waives === undefined) return { required: undefined };
  return { required: true, source: 'no waiver in file' };
}

module.exports = { capacity, prName, bondStatus };
