// DE-295/GC-395 Ex Parte Petition for Final Discharge and Order (New January 1, 2006).
// Prob. Code 12250. Decedent estate boxes only. The distribution facts (order dates, receipts,
// recording information) are attorney answers; the court's order section is left for the judge
// except the name and capacity, which match the petition.
const { header, caption, petitionerFor } = require('../header');
const { fmtDate } = require('../format');
const { prName } = require('../logic');

const ID = 'DE-295';
const P = 'DE-295[0].Page1[0].';
const TP = `${P}StdP1Header_sf[0].TitlePartyName[0].`;
const TX = 'TEXT\\.0\\.2\\.1\\.0\\.2\\.1\\.4\\.2\\.0\\.1\\.1\\.1\\.0\\.1\\.1\\.0\\.0\\.1\\.2\\.1\\.1\\.';
const T10 = (i) => `${P}${TX}7\\.9\\.1\\.1\\.1\\.1\\.3\\.1\\.3\\.1\\.6\\.1\\.10[${i}]`;
const T12 = (i) => `${P}${TX}7\\.9\\.1\\.1\\.1\\.1\\.3\\.1\\.3\\.1\\.6\\.1\\.12[${i}]`;

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F, { estateFields: [`${TP}${TX}7\\.9\\.1\\.1\\.1\\.1\\.3\\.1\\.3\\.1\\.6\\.1\\.10[0]`] });
  f.check(`${TP}Checkbox[4]`, true, { item: 'Caption', label: 'ESTATE', source: 'Decedent estate' });
  f.check(`${TP}Checkbox[2]`, true, { item: 'Caption', label: 'DECEDENT', source: 'Decedent estate' });
  for (const [i, l] of [[3, 'GUARDIANSHIP OF'], [5, 'CONSERVATORSHIP'], [1, 'CONSERVATEE'], [0, 'MINOR']]) f.check(`${TP}Checkbox[${i}]`, false, { item: 'Caption', label: l, source: 'Decedent estate' });
  // 1. petitioner capacity and orders
  f.check(`${P}Checkbox[6]`, true, { item: '1', label: 'personal representative', source: 'Decedent estate' });
  f.check(`${P}Checkbox[7]`, false, { item: '1', label: 'conservator', source: 'Decedent estate' });
  f.check(`${P}Checkbox[8]`, false, { item: '1', label: 'guardian', source: 'Decedent estate' });
  const prelim = F.get('discharge.preliminaryOrders', ID, { label: 'Were there preliminary orders for distribution or liquidation (besides the final order)? Answer "no" or list each order and the date it was filed', type: 'text' });
  const hasPrelim = prelim !== undefined && !/^no(ne)?$/i.test(String(prelim).trim());
  f.check(`${P}Checkbox[9]`, prelim === undefined ? undefined : hasPrelim, { item: '1', label: 'and all preliminary orders', source: F.src('discharge.preliminaryOrders'), need: 'discharge.preliminaryOrders' });
  const fo = F.get('discharge.finalOrderDate', ID, { label: 'Date the order of final distribution was filed', type: 'date' });
  f.text(T10(3), fo ? { value: `Order of final distribution filed ${fmtDate(fo)}${hasPrelim ? `; ${prelim}` : ''}`, source: `${F.src('discharge.finalOrderDate')}${hasPrelim ? `; ${F.src('discharge.preliminaryOrders')}` : ''}` } : undefined, { item: '1', label: 'Date each order was filed', need: 'discharge.finalOrderDate' });
  // 2. acts of distribution
  const yn = (key, label) => F.get(key, ID, { label, type: 'yesno' });
  const a = yn('discharge.personalDelivered', 'Has all personal property been delivered to the distributees as ordered, with all receipts filed (or filed with this petition)?');
  f.check(`${P}Checkbox[0]`, a, { item: '2a', label: 'All personal property delivered; receipts on file', source: F.src('discharge.personalDelivered'), need: 'discharge.personalDelivered' });
  const b = yn('discharge.noPersonalOnHand', 'Is there no personal property on hand for distribution?');
  f.check(`${P}Checkbox[1]`, b, { item: '2b', label: 'No personal property on hand', source: F.src('discharge.noPersonalOnHand'), need: 'discharge.noPersonalOnHand' });
  const hasReal = F.get('estate.hasRealProperty', ID);
  if (hasReal === true) {
    const rec = F.get('discharge.realPropertyRecording', ID, { label: 'Recording information for the order and/or deed distributing the real property (documents, dates, county, document numbers)', type: 'text' });
    f.check(`${P}Checkbox[2]`, rec ? true : undefined, { item: '2c', label: 'Real property distributed; recorded as follows', source: F.src('discharge.realPropertyRecording'), need: 'discharge.realPropertyRecording' });
    f.text(`${P}${TX}1[0]`, rec ? { value: rec, source: F.src('discharge.realPropertyRecording') } : undefined, { item: '2c', label: 'Recording information', need: 'discharge.realPropertyRecording' });
  } else {
    f.check(`${P}Checkbox[2]`, hasReal === false ? false : undefined, { item: '2c', label: 'Real property distributed', source: F.src('estate.hasRealProperty'), need: 'estate.hasRealProperty' });
    f.text(`${P}${TX}1[0]`, undefined, { item: '2c', blankReason: 'No real property in the estate' });
  }
  const d = yn('discharge.noRealOnHand', 'Is there no real property on hand for distribution?');
  f.check(`${P}Checkbox[3]`, d, { item: '2d', label: 'No real property on hand', source: F.src('discharge.noRealOnHand'), need: 'discharge.noRealOnHand' });
  const sole = yn('discharge.petitionerSoleDistributee', 'Is the petitioner the sole distributee (no receipts required)?');
  f.check(`${P}Checkbox[4]`, sole, { item: '2e', label: 'Petitioner is the sole distributee', source: F.src('discharge.petitionerSoleDistributee'), need: 'discharge.petitionerSoleDistributee' });
  f.check(`${P}Checkbox[5]`, false, { item: '2f', label: 'Minor attained majority', source: 'Decedent estate' });
  f.text(T10(0), undefined, { item: '2f', blankReason: 'Decedent estate' });
  f.text(T10(1), undefined, { item: 'Verification', label: 'Date', blankReason: 'Dated when the petitioner signs' });
  const pr = prName(F, ID);
  f.text(T12(0), pr ? { value: pr.value.toUpperCase(), source: pr.source } : undefined, { item: 'Verification', label: 'Name of petitioner', need: 'petitioner.name' });
  f.text(T12(1), undefined, { item: 'Verification', label: 'Signature of petitioner', blankReason: 'Signed by the petitioner' });
  // order
  f.text(T10(2), pr, { item: 'Order', label: 'The court orders that (name)', need: 'petitioner.name' });
  f.check(`${P}Checkbox[10]`, true, { item: 'Order', label: 'is discharged as personal representative', source: 'Decedent estate' });
  f.check(`${P}Checkbox[11]`, false, { item: 'Order', label: 'conservator', source: 'Decedent estate' });
  f.check(`${P}Checkbox[12]`, false, { item: 'Order', label: 'guardian', source: 'Decedent estate' });
  if (a === true && sole !== true) ctx.warnings.push('Attach conformed copies of the receipts previously filed as Attachment 2 (DE-295 item 2a).');
}

module.exports = { id: ID, kind: 'jc', title: 'Ex Parte Petition for Final Discharge and Order', revision: 'New January 1, 2006', template: 'DE-295.pdf', sourceUrl: 'https://courts.ca.gov/documents/de295.pdf', procedures: ['full'], fill };
