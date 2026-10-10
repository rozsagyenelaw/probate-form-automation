// DE-160/GC-040 Inventory and Appraisal (Rev. January 1, 2007). Prob. Code 8800 to 8980.
// Item 1 totals only the cash items whose date-of-death values Rozsa has confirmed
// (Attachment 1, appraised by the personal representative). Item 2 and the referee
// declaration on page 2 are left for the probate referee. Item 5 is the Prob. Code 8800(d)
// certification that Rev. & Tax. Code 480 is not applicable or has been satisfied (BOE-502-D).
const { header, caption, petitionerFor } = require('../header');
const { fmtDate, money, num } = require('../format');
const { bondStatus, prName } = require('../logic');
const firm = require('../firm');
const { inventoryItems } = require('../admin-helpers');

const ID = 'DE-160';
const P1 = 'DE-160[0].Page1[0].';
const C = `${P1}P1Caption[0].`;
const T = `${C}FormTitle[0].`;
const P2 = 'DE-160[0].Page2[0].';

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  for (const pre of [`${C}TitlePartyName[0].#area[0].`, `${P2}PxCaption[0].TitlePartyName[0].#area[0].`]) {
    f.check(`${pre}petitioner_cb1[0]`, true, { item: 'Caption', label: 'Decedent', source: 'Decedent estate' });
    f.check(`${pre}petitioner_cb1[1]`, false, { item: 'Caption', label: 'Conservatee', source: 'Decedent estate' });
    f.check(`${pre}petitioner_cb1[2]`, false, { item: 'Caption', label: 'Minor', source: 'Decedent estate' });
  }
  const kind = F.get('inventory.kind', ID, { label: 'Inventory and Appraisal: final, partial, or supplemental?', type: 'choice', options: ['final', 'partial', 'supplemental'] });
  f.check(`${T}#area[0].CheckBoxCaption[0]`, kind === undefined ? undefined : kind === 'final', { item: 'Title', label: 'Final', source: F.src('inventory.kind'), need: 'inventory.kind' });
  f.check(`${T}Checkbox[0]`, kind === undefined ? undefined : kind === 'partial', { item: 'Title', label: 'Partial', source: F.src('inventory.kind') });
  f.text(`${T}TextField[0]`, kind === 'partial' ? F.v('inventory.partialNo', ID, { label: 'Partial inventory number' }) : undefined, { item: 'Title', label: 'Partial No.', blankReason: 'Not a partial inventory' });
  f.check(`${T}#area[1].CheckBoxCaption[1]`, kind === undefined ? undefined : kind === 'supplemental', { item: 'Title', label: 'Supplemental', source: F.src('inventory.kind') });
  for (const [n, l] of [['#area[2].CheckBoxCaption[2]', 'Corrected'], ['#area[3].CheckBoxCaption[3]', 'Reappraisal for Sale'], ['#area[4].CheckBoxCaption[4]', 'Property Tax Certificate']]) f.check(`${T}${n}`, false, { item: 'Title', label: l, source: 'Not this filing' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text(`${C}CaseNumber[0].TextField[0]`, dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: 'Caption', label: 'Date of death', need: 'decedent.dateOfDeath' });

  // 1 and 2: appraisals
  const att1 = inventoryItems(F).filter((i) => i.att === 1);
  const vals = att1.map((i) => F.get(`asset.${i.id}.dodValue`, ID, { label: `Date-of-death value of ${i.description} (Attachment 1, appraised by the personal representative; the intake figure is the client's estimate)`, type: 'money' }));
  const all = vals.every((v) => v !== undefined);
  const t1 = all ? vals.reduce((s, v) => s + num(v), 0) : undefined;
  f.text(`${P1}DecimalField3[0]`, att1.length ? (t1 !== undefined ? { value: money(t1), source: 'sum of confirmed Attachment 1 values (formAnswers asset.*.dodValue)' } : undefined) : { value: '0.00', source: 'no cash items in the file' }, { item: '1', label: 'Total appraisal by representative (Attachment 1)', need: 'asset.*.dodValue' });
  f.text(`${P1}DecimalField2[0]`, undefined, { item: '2', label: 'Total appraisal by referee (Attachment 2)', blankReason: 'Completed by the probate referee' });
  f.text(`${P1}DecimalField1[0]`, undefined, { item: 'Total', label: 'Total', blankReason: 'Completed after the referee appraises Attachment 2' });
  f.text(`${P1}TextField6[0]`, undefined, { item: '3', blankReason: 'not used' });
  // 3. all or a portion
  const ap = F.get('inventory.allOrPortion', ID, { label: 'Do the attachments (with prior inventories) state all of the estate, or a portion?', type: 'choice', options: ['all', 'a portion'] });
  f.check(`${C}#area[0].CheckBoxCaption[0]`, ap === undefined ? undefined : ap === 'all', { item: '3', label: 'all', source: F.src('inventory.allOrPortion'), need: 'inventory.allOrPortion' });
  f.check(`${C}#area[0].#area[1].CheckBoxCaption[1]`, ap === undefined ? undefined : ap === 'a portion', { item: '3', label: 'a portion', source: F.src('inventory.allOrPortion') });
  // 4. no referee (only by court order)
  const noRef = F.opt('inventory.noRefereeOrderDate');
  f.check(`${C}#area[2].CheckBoxCaption[2]`, !!noRef, { item: '4', label: 'No probate referee is required', source: noRef ? F.src('inventory.noRefereeOrderDate') : 'No order waiving the referee in the file' });
  f.check(`${C}#area[2].#area[3].CheckBoxCaption[3]`, !!noRef, { item: '4', label: 'by order of the court dated', source: noRef ? F.src('inventory.noRefereeOrderDate') : 'No order in file' });
  f.text(`${C}TextField6[0]`, noRef ? { value: fmtDate(noRef), source: F.src('inventory.noRefereeOrderDate') } : undefined, { item: '4', label: 'Order date', blankReason: 'No order waiving the referee' });
  // 5. property tax certificate (Prob. Code 8800(d); Rev. & Tax. Code 480)
  const hasReal = F.get('estate.hasRealProperty', ID);
  let filed;
  if (hasReal === true) filed = F.get('boe502d.filed', ID, { label: 'Has the change in ownership statement (BOE-502-D) been filed with the assessor of each county where the decedent owned real property? (Rev. & Tax. Code 480; required for the item 5 certification)', type: 'yesno' });
  f.check(`${C}#area[4].CheckBoxCaption[4]`, hasReal === undefined ? undefined : hasReal === false, { item: '5a', label: 'Not applicable: no California real property', source: F.src('estate.hasRealProperty'), need: 'estate.hasRealProperty' });
  f.check(`${C}#area[5].CheckBox19[0]`, hasReal === false ? false : filed, { item: '5b', label: 'Satisfied by filing a change in ownership statement', source: F.src('boe502d.filed'), need: hasReal ? 'boe502d.filed' : undefined });
  if (hasReal === true && filed === false) ctx.warnings.push('File the BOE-502-D with the assessor before or with this inventory (Rev. & Tax. Code 480(b)); item 5b cannot be certified until then.');
  f.text(`${C}#area[6].Date[0]`, undefined, { item: 'Declaration', label: 'Date', blankReason: 'Dated when the personal representative signs' });
  const pr = prName(F, ID);
  f.text(`${C}#area[6].PrintName[0]`, pr ? { value: pr.value.toUpperCase(), source: pr.source } : undefined, { item: 'Declaration', label: 'Name of personal representative', need: 'petitioner.name' });
  // 6 to 8: statement about the bond (signed by the attorney)
  const bs = bondStatus(F, ID);
  f.check(`${C}#area[7].CheckBoxCaption[5]`, bs.required === undefined ? undefined : bs.required === false, { item: '6', label: 'Bond is waived', source: bs.source, need: 'will.waivesBond' });
  const bondAmt = bs.required === true ? F.get('petition.bondAmount', ID) : undefined;
  f.check(`${C}#area[8].CheckBoxCaption[6]`, bs.required === undefined ? undefined : bs.required === true, { item: '7', label: 'Bond filed', source: bs.source });
  f.text(`${C}DecimalField8[0]`, bondAmt !== undefined ? { value: money(bondAmt), source: F.src('petition.bondAmount') } : undefined, { item: '7', label: 'Bond amount', blankReason: bs.required === false ? 'Bond waived' : '', need: bs.required ? 'petition.bondAmount' : undefined });
  const suff = bs.required === true ? F.get('inventory.bondSufficient', ID, { label: 'Is the bond on file sufficient for the inventoried estate?', type: 'yesno' }) : undefined;
  f.check(`${C}#area[9].petitioner_cb[0]`, bs.required === true ? suff : false, { item: '7', label: 'Sufficient', source: bs.required ? F.src('inventory.bondSufficient') : 'Bond waived' });
  f.check(`${C}#area[10].petitioner_cb[1]`, bs.required === true ? (suff === undefined ? undefined : !suff) : false, { item: '7', label: 'Insufficient', source: bs.required ? F.src('inventory.bondSufficient') : 'Bond waived' });
  const blocked = F.opt('petition.blockedAccount'); const hasBlocked = blocked && !/^none$/i.test(String(blocked).trim());
  f.check(`${C}#area[11].CheckBoxCaption[7]`, !!hasBlocked, { item: '8', label: 'Receipts for blocked account filed', source: hasBlocked ? F.src('petition.blockedAccount') : 'No blocked account in file' });
  f.text(`${C}DecimalField7[0]`, undefined, { item: '8', label: 'Blocked amount', blankReason: hasBlocked ? 'Enter the receipted amount' : 'No blocked account' });
  f.text(`${C}TextField6[1]`, hasBlocked ? F.v('petition.blockedAccount') : undefined, { item: '8', label: 'Institution and location', blankReason: 'No blocked account' });
  f.text(`${C}#area[12].Date[1]`, undefined, { item: 'Bond statement', label: 'Date', blankReason: 'Dated when the attorney signs' });
  f.text(`${C}#area[12].PrintName[1]`, firm.attorneyNameCaps, { item: 'Bond statement', label: 'Attorney name', source: 'Firm block (firm.js)' });
  // page 2: probate referee
  for (const n of ['DecimalField6[0]', 'DecimalField5[0]', 'DecimalField4[0]', '#area[0].Date[0]', '#area[0].PrintName[0]']) f.text(`${P2}${n}`, undefined, { item: 'Referee', blankReason: 'Completed by the probate referee' });
  const ref = F.get('referee.name', ID, { label: 'Probate referee (name) appointed for this estate', type: 'text' });
  if (ref) ctx.warnings.push(`Send to probate referee ${ref} with Attachment 2 for appraisal.`);
}

module.exports = { id: ID, kind: 'jc', title: 'Inventory and Appraisal', revision: 'Rev. January 1, 2007', template: 'DE-160.pdf', sourceUrl: 'https://courts.ca.gov/documents/de160.pdf', procedures: ['full', '13151', '13100', '13200'], fill };
