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

// Order of events in a full probate. Warns (never blocks) when dates in the file are out of order,
// e.g. Letters before the hearing that appoints the personal representative.
function dateSequence(F) {
  const { isoDate } = require('./format');
  const d = (k) => { const v = F.opt(k); return v ? isoDate(v) : ''; };
  const saleDates = []; const saleHearings = [];
  for (let i = 1; i <= 5; i++) { if (d(`sale.${i}.saleDate`)) saleDates.push([`sale.${i}.saleDate`, d(`sale.${i}.saleDate`)]); if (d(`sale.${i}.hearingDate`)) saleHearings.push([`sale.${i}.hearingDate`, d(`sale.${i}.hearingDate`)]); }
  const seq = [
    [['decedent.dateOfDeath', d('decedent.dateOfDeath')]],
    [['hearing.date', d('hearing.date')]],
    [['final.willAdmittedDate', d('final.willAdmittedDate')], ['letters.date', d('letters.date')]],
    [['creditors.noticeDate', d('creditors.noticeDate')], ...saleDates],
    saleHearings,
    [['final.hearingDate', d('final.hearingDate')]],
    [['discharge.finalOrderDate', d('discharge.finalOrderDate')]],
  ];
  const out = [];
  for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) {
    for (const [ka, a] of seq[i]) for (const [kb, b] of seq[j]) {
      if (a && b && b < a) out.push(`Dates out of order: ${kb} (${b}) is before ${ka} (${a}). Check the dates in the file.`);
    }
  }
  if (d('letters.date') && d('hearing.date') && d('letters.date') < d('hearing.date')) { /* already reported */ }
  return [...new Set(out)];
}

// Real property sold during administration (sale.N.* answers, N = parcel index + 1), and what is
// left to distribute. Used so the final petition, order, DE-295 and BOE-502-D agree with the sale.
function sales(F) {
  const { num } = require('./format');
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => {
    const k = `sale.${i + 1}`;
    const bid = F.opt(`${k}.amountBid`); const appraised = F.opt(`${k}.reappraisedValue`) || F.opt(`${k}.appraisedValue`);
    const sold = bid !== undefined && !!F.opt(`${k}.saleDate`);
    return { index: i, parcel: p, key: k, sold, bid, appraised, gainLoss: sold && appraised !== undefined ? num(bid) - num(appraised) : undefined, source: sold ? `${F.src(`${k}.amountBid`)}; ${F.src(`${k}.saleDate`)}` : '' };
  });
}

// Cash on hand (final petition para 18, order para 5) against the file: estate cash confirmed on
// the inventory (Attachment 1) + net proceeds of court-confirmed sales (bid - commission -
// encumbrance) + prices of sales by notice of proposed action - creditor claims. Expenses are not
// in the file, so this is an upper bound. ok=false when the typed cash is above it.
function cashCheck(F) {
  const { num, money } = require('./format');
  const poh = String(F.opt('final.propertyOnHand') || '');
  const m = poh.match(/cash of \$([\d,]+(?:\.\d{2})?)/i);
  const items = require('./admin-helpers').inventoryItems(F);
  const a1 = items.filter((i) => i.att === 1).map((i) => F.opt(`asset.${i.id}.dodValue`));
  if (!m || !a1.every((v) => v !== undefined)) return { checked: false };
  let bound = a1.reduce((t, v) => t + num(v), 0); const parts = [`estate cash $${money(bound)}`];
  for (const x of sales(F).filter((y) => y.sold)) {
    const comm = num(F.opt(`${x.key}.commissionPercent`) || 0) / 100 * num(x.bid); const enc = num(x.parcel.mortgageBalance || 0);
    bound += num(x.bid) - comm - enc; parts.push(`sale of ${x.parcel.address} $${money(x.bid)} less commission $${money(comm)} and encumbrance $${money(enc)}`);
  }
  (Array.isArray(F.caseData.proposedActions) ? F.caseData.proposedActions : []).forEach((a) => { const mm = String(a.price || a.description || '').match(/\$([\d,]+(?:\.\d{2})?)/); if (mm && /sale|sell/i.test(String(a.title))) { bound += num(mm[1]); parts.push(`${a.title} $${mm[1]}`); } });
  (Array.isArray(F.caseData.creditorClaims) ? F.caseData.creditorClaims : []).forEach((cl) => { const amt = num(cl.amountAllowed || cl.amountClaimed || 0); bound -= amt; parts.push(`less claim of ${cl.claimantName} $${money(amt)}`); });
  const cash = num(m[1]);
  return { checked: true, ok: cash <= bound + 0.005, cash: m[1], bound, boundText: money(bound), parts: parts.join('; ') };
}

module.exports = { capacity, prName, bondStatus, dateSequence, sales, cashCheck };
