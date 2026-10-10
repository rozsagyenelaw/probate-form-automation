// Statutory compensation, Prob. Code 10810 (attorney) and 10800 (personal representative):
// 4% of the first $100,000, 3% of the next $100,000, 2% of the next $800,000, 1% of the next
// $9,000,000, 0.5% of the next $15,000,000; above $25,000,000 a reasonable amount set by the court.
// Base (10810(b)): inventory appraisal + gains over appraisal on sales + receipts - losses on sales,
// without reference to encumbrances.
const TIERS = [[100000, 0.04], [100000, 0.03], [800000, 0.02], [9000000, 0.01], [15000000, 0.005]];
function statutoryFee(base) {
  let rest = Math.max(0, Number(base) || 0); let fee = 0; const lines = [];
  for (const [amt, rate] of TIERS) {
    const part = Math.min(rest, amt);
    if (part <= 0) break;
    fee += part * rate; lines.push({ amount: part, rate, fee: part * rate });
    rest -= part;
  }
  return { fee: Math.round(fee * 100) / 100, lines, overCap: rest > 0 };
}
module.exports = { statutoryFee };
