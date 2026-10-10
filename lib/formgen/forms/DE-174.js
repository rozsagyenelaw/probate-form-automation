// DE-174 Allowance or Rejection of Creditor's Claim (Rev. January 1, 2009). Prob. Code 9250 to 9256.
// One form per filed claim (case.creditorClaims[]). Whether a claim is allowed or rejected is
// always Rozsa's answer; exactly one of items 8 and 9 is checked, never both (office standard),
// and only money goes in the money fields. The court's section (12, 13) and the proof of
// mailing on page 2 are left blank. This form has no tooltips, so the caption is filled here.
const { courtFor } = require('../courts');
const { fmtDate, money, num } = require('../format');
const { prName } = require('../logic');
const { S } = require('../facts');

const ID = 'DE-174';

function records(F) {
  const list = Array.isArray(F.caseData.creditorClaims) ? F.caseData.creditorClaims : [];
  if (!list.length) return [{ label: 'Creditor claim (enter the claim details in the answers)', key: 'claim.1', data: {} }];
  return list.map((c, i) => ({ label: `${S(c.claimantName) || `Claim ${i + 1}`}${c.amountClaimed ? ` ($${money(c.amountClaimed)})` : ''}`, key: `claim.${i + 1}`, data: c, idx: i }));
}

function val(F, rec, field, label, type) {
  const d = rec.data[field];
  if (d !== undefined && d !== null && d !== '') return { value: d, source: `case.creditorClaims[${rec.idx}].${field}` };
  const v = F.get(`${rec.key}.${field}`, ID, { label, type });
  return v === undefined ? undefined : { value: v, source: F.src(`${rec.key}.${field}`) };
}

async function fill(f, F, ctx) {
  const rec = ctx.record;
  // this form's caption fields auto-size to a large font: fix them at 8 or 9 points
  for (const n of ['FillText25', 'FillText180', 'FillText17', 'FillText21']) f.field(n).setFontSize(8);
  for (const n of ['FillText26', 'FillText30', 'FillText34', 'FillText63', 'FillText38', 'FillText51', 'FillText55', 'FillText59', 'FillText67', 'FillText71', 'FillText75', 'FillText79', 'FillText83', 'FillText87', 'FillText91', 'FillText95', 'FillText99', 'FillText103', 'FillText107', 'FillText119']) f.field(n).setFontSize(9);
  const fl = require('../filer').filer(F, ID);
  const fs = { item: 'Caption' };
  f.text('FillText25', fl.name, { ...fs, label: 'Party line 1 (name)', need: 'petitioner.name' });
  f.text('FillText180', fl.street, { ...fs, label: 'Party line 2 (street)', need: 'petitioner.address' });
  f.text('FillText17', fl.cityStateZip, { ...fs, label: 'Party line 3 (city, state, ZIP)', need: 'petitioner.address' });
  f.text('FillText21', undefined, { ...fs, label: 'Party line 4', blankReason: 'Not used' });
  f.text('FillText26', fl.phone, { ...fs, label: 'Telephone', need: 'petitioner.phone' });
  f.text('FillText42', '', { item: 'Caption', label: 'Fax', blankReason: 'No fax (house rule)' });
  f.text('FillText30', fl.email, { ...fs, label: 'Email', blankReason: 'No email in the file' });
  f.text('FillText34', fl.attorneyFor, { item: 'Caption', label: 'Attorney for' });
  const c = courtFor(F, ID);
  f.text('FillText63', c.county ? { value: c.county.toUpperCase(), source: c.countySource } : undefined, { item: 'Caption', label: 'County', need: 'court.county' });
  f.text('FillText38', c.street ? { value: c.street, source: c.source } : undefined, { item: 'Caption', label: 'Court street address', need: c.need });
  f.text('FillText51', c.mailing ? { value: c.mailing, source: c.source } : undefined, { item: 'Caption', label: 'Court mailing address', need: c.need });
  f.text('FillText55', c.cityZip ? { value: c.cityZip, source: c.source } : undefined, { item: 'Caption', label: 'Court city and ZIP', need: c.need });
  f.text('FillText59', c.branch ? { value: c.branch, source: c.source } : undefined, { item: 'Caption', label: 'Branch name', need: c.need });
  const dn = F.v('decedent.name', ID);
  f.text('FillText67', dn ? { value: dn.value.toUpperCase(), source: dn.source } : undefined, { item: 'Caption', label: 'Estate of (name), pages 1 and 2', need: 'decedent.name' });
  const cn = F.opt('case.number');
  f.text('FillText71', cn ? { value: cn, source: F.src('case.number') } : undefined, { item: 'Caption', label: 'Case number, pages 1 and 2', blankReason: 'Blank until the court assigns a number' });

  const name = val(F, rec, 'claimantName', 'Name of the creditor who filed the claim', 'text');
  f.text('FillText75', name, { item: '1', label: 'Name of creditor', need: `${rec.key}.claimantName` });
  const filed = val(F, rec, 'dateFiled', 'Date the creditor filed the claim with the court', 'date');
  f.text('FillText79', filed ? { value: fmtDate(filed.value), source: filed.source } : undefined, { item: '2', label: 'Claim filed on (date)', need: `${rec.key}.dateFiled` });
  const ld = F.get('letters.date', ID);
  f.text('FillText83', ld ? { value: fmtDate(ld), source: F.src('letters.date') } : undefined, { item: '3', label: 'Date of first issuance of letters', need: 'letters.date' });
  const nd = F.get('creditors.noticeDate', ID, { label: 'Date the Notice of Administration to Creditors (DE-157) was mailed', type: 'date' });
  f.text('FillText87', nd ? { value: fmtDate(nd), source: F.src('creditors.noticeDate') } : undefined, { item: '4', label: 'Date of Notice of Administration', need: 'creditors.noticeDate' });
  const dod = F.get('decedent.dateOfDeath', ID);
  f.text('FillText91', dod ? { value: fmtDate(dod), source: F.src('decedent.dateOfDeath') } : undefined, { item: '5', label: "Date of decedent's death", need: 'decedent.dateOfDeath' });
  const ev = F.get('estate.estimatedValue', ID, { label: 'Estimated value of the estate (DE-174 item 6; usually the inventory total)', type: 'money' });
  f.text('FillText95', ev !== undefined ? { value: money(ev), source: F.src('estate.estimatedValue') } : undefined, { item: '6', label: 'Estimated value of estate', need: 'estate.estimatedValue' });
  const amt = val(F, rec, 'amountClaimed', 'Total amount of the claim', 'money');
  f.text('FillText99', amt ? { value: money(amt.value), source: amt.source } : undefined, { item: '7', label: 'Total amount of the claim', need: `${rec.key}.amountClaimed` });

  const dec = F.get(`${rec.key}.decision`, ID, { label: `Allow or reject the claim of ${name ? name.value : 'this creditor'}? (one only)`, type: 'choice', options: ['allow', 'reject'] });
  let decAmt;
  if (dec) {
    const a = F.opt(`${rec.key}.decisionAmount`);
    decAmt = a !== undefined ? { value: money(a), source: F.src(`${rec.key}.decisionAmount`) } : (amt ? { value: money(amt.value), source: `${amt.source} (full amount of the claim)` } : undefined);
  }
  f.check('CheckBox23', dec === undefined ? undefined : dec === 'allow', { item: '8', label: 'Claim is allowed', source: F.src(`${rec.key}.decision`), need: `${rec.key}.decision` });
  f.text('FillText103', dec === 'allow' ? decAmt : undefined, { item: '8', label: 'Allowed for $', blankReason: dec === 'reject' ? 'Claim rejected (item 9)' : 'NEEDS ANSWER' });
  f.check('CheckBox1', dec === undefined ? undefined : dec === 'reject', { item: '9', label: 'Claim is rejected', source: F.src(`${rec.key}.decision`) });
  f.text('FillText107', dec === 'reject' ? decAmt : undefined, { item: '9', label: 'Rejected for $', blankReason: dec === 'allow' ? 'Claim allowed (item 8)' : 'NEEDS ANSWER' });
  if (dec && decAmt && amt && num(decAmt.value) !== num(amt.value)) ctx.warnings.push('The amount allowed or rejected differs from the claim total. A partial allowance and partial rejection needs both items 8 and 9: edit the form by hand if that is intended.');
  f.text('FillText111', undefined, { item: '10', label: 'Notice of allowance or rejection given on (date)', blankReason: 'Written when notice is given' });
  const iaea = F.get('petition.iaeaAuthority', ID);
  f.check('CheckBox2', iaea === undefined ? undefined : iaea !== 'none', { item: '11', label: 'PR authorized under IAEA', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  f.text('FillText115', undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated when the personal representative signs' });
  const pr = prName(F, ID);
  f.text('FillText119', pr ? { value: pr.value.toUpperCase(), source: pr.source } : undefined, { item: 'Signature', label: 'Name of personal representative', need: 'petitioner.name' });
  for (const n of ['FillText123', 'FillText127', 'FillText131', 'FillText135']) f.text(n, undefined, { item: 'Court', blankReason: "Court's approval or rejection" });
  for (const n of ['CheckBox217', 'CheckBox16', 'CheckBox218']) f.check(n, false, { item: 'Court', source: "Court's approval or rejection" });
  for (const n of ['FillText148', 'FillText152', 'FillText156', 'FillText160', 'FillText164', 'FillText168', 'FillText172', 'FillText176', 'FillText6', 'FillText181', 'FillText18']) f.text(n, undefined, { item: 'Proof of service', blankReason: 'Completed by the person who mails or delivers it' });
  for (const n of ['CheckBox3', 'CheckBox219', 'CheckBox221']) { try { f.check(n, false, { item: 'Proof of service', source: 'Completed by the person who mails or delivers it' }); } catch (e) { /* radio group */ } }
  ctx.warnings.push('Attach a copy of the creditor\'s claim (DE-172). Some claims need court approval (Prob. Code 9251 to 9256).');
}

// the red on-screen privacy banner and its white-out are screen-only fields: hide them
async function after(doc) {
  const { PDFName } = require('pdf-lib');
  const form = doc.getForm();
  for (const n of ['WhiteOut', 'NoticeHeader1', 'NoticeFooter1']) {
    const fld = form.getFields().find((x) => x.getName() === n);
    if (fld) for (const w of fld.acroField.getWidgets()) w.dict.set(PDFName.of('F'), doc.context.obj(2));
  }
}

module.exports = { after, id: ID, kind: 'jc', title: "Allowance or Rejection of Creditor's Claim", revision: 'Rev. January 1, 2009', template: 'DE-174.pdf', sourceUrl: 'https://courts.ca.gov/documents/de174.pdf', procedures: ['full'], records, fill };
