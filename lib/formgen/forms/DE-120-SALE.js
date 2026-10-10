// DE-120 Notice of Hearing used for the report of sale and petition to confirm the sale of real
// property (Prob. Code 10308(c), 1220, 1230). Same form and code as DE-120, one per parcel.
const base = require('./DE-120');

function records(F) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => ({ label: p.address || `Parcel ${i + 1}`, parcel: p, index: i }));
}

module.exports = {
  ...base,
  id: 'DE-120-SALE',
  title: 'Notice of Hearing: confirmation of sale of real property',
  procedures: ['full'],
  note: 'DE-120 for the DE-260 hearing (notice to the 1220 persons and the purchaser).',
  records,
  fill: async (f, F, ctx) => {
    ctx.extra = { ...(ctx.extra || {}), purpose: 'sale', record: ctx.record.index };
    return base.fill(f, F, ctx);
  },
};
