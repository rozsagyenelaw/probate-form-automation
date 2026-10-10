// DE-260/GC-060 Report of Sale and Petition for Order Confirming Sale of Real Property
// (Rev. January 1, 2006). Court-confirmation route for selling estate real property:
// Prob. Code 10308 (report and confirmation; within 30 days the purchaser may file), 10309
// (private sale: appraisal within one year of the hearing, offer at least 90% of appraisal),
// 10310 to 10313 (hearing, overbids: 10% of the first $10,000 plus 5% of the excess), 10300 to
// 10303 (notice of sale; exceptions), 10160 to 10166 (broker commission); LASC Local Rule 4.39
// (no confirmation if filed or sold before the date in the published notice; notice to specific
// devisees; overbid form; commission cap 5% improved / 10% raw land).
// One form per parcel (records = case.assets.realProperty). Every sale fact is Rozsa's answer.
// The old DE-260 has no field tooltips and flat field names; fields are mapped by position.
const firm = require('../firm');
const { courtFor } = require('../courts');
const { fmtDate, money, num } = require('../format');
const { capacity, prName } = require('../logic');

const ID = 'DE-260';
const SRC = 'Firm block (lib/formgen/firm.js)';

function records(F) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => ({ label: p.address || `Parcel ${i + 1}`, parcel: p, index: i }));
}

function overbid(bid) {
  const b = num(bid);
  const first = Math.min(b, 10000) * 0.10;
  const rest = Math.max(0, b - 10000) * 0.05;
  return { first, rest, min: b + first + rest };
}

async function fill(f, F, ctx) {
  const k = `sale.${ctx.record.index + 1}`;
  const q = (key, label, type, options) => F.get(`${k}.${key}`, ID, { label: `Sale of ${ctx.record.label}: ${label}`, type, options });
  const s = (key) => F.src(`${k}.${key}`);
  const P = ctx.record.parcel;
  // this old form has auto-size (0) fonts that print oversized: use 9 pt, 8 pt for long lines
  for (const fld of f.form.getFields()) if (fld.constructor.name === 'PDFTextField') { try { fld.setFontSize(/FillText108|FillText115|FillText19|FillText20|FillText21/.test(fld.getName()) ? 8 : 9); } catch (e) { /* ignore */ } }

  // caption (fields are shared by both pages)
  [['FillText137', `${firm.attorneyName} (SBN ${firm.barNumber})`], ['FillText135', firm.firmName], ['FillText134', firm.street], ['FillTxt134', firm.cityStateZip()], ['FillText133', firm.phone], ['FillText131', firm.email]]
    .forEach(([n, v]) => f.text(n, v, { item: 'Caption', label: 'Attorney block', source: SRC }));
  f.text('FillText132', '', { item: 'Caption', label: 'Fax', blankReason: 'No fax (house rule)' });
  const cap = capacity(F, ID);
  const pr = prName(F, ID);
  f.text('FillText130', pr && cap ? { value: `${cap.value.replace(/^\w/, (c) => c.toUpperCase())} ${pr.value}`, source: `${cap.source}; ${pr.source}` } : undefined, { item: 'Caption', label: 'Attorney for', need: 'pr.capacity' });
  const c = courtFor(F, ID);
  f.text('FillText129', c.county ? { value: c.county.toUpperCase(), source: c.countySource } : undefined, { item: 'Caption', label: 'County', need: 'court.county' });
  [['FillText128', c.street, 'Court street'], ['FillText127', c.mailing, 'Court mailing'], ['FillText126', c.cityZip, 'Court city and ZIP'], ['FillText125', c.branch, 'Branch']]
    .forEach(([n, v, l]) => f.text(n, v ? { value: v, source: c.source } : undefined, { item: 'Caption', label: l, need: c.need }));
  f.checkState('CheckBox36', '1', { item: 'Caption', label: 'Estate', source: 'decedent estate' });
  f.checkState('ChekBox36', null, { item: 'Caption', label: 'Conservatorship' });
  f.checkState('ChckBox36', null, { item: 'Caption', label: 'Guardianship' });
  const dn = F.v('decedent.name', ID);
  f.text('FillText124', dn ? { value: dn.value.toUpperCase(), source: dn.source } : undefined, { item: 'Caption', label: 'Estate of (name)', need: 'decedent.name' });
  f.checkState('CheckBox38', '1', { item: 'Caption', label: 'Decedent', source: 'decedent estate' });
  f.checkState('ChckBox38', null, { item: 'Caption', label: 'Conservatee' });
  f.checkState('CheckBx38', null, { item: 'Caption', label: 'Minor' });
  const cn = F.opt('case.number');
  f.text('FillText123', cn ? F.v('case.number') : undefined, { item: 'Caption', label: 'Case number', need: 'case.number' });
  if (!cn) F.need('case.number', ID);
  const hd = F.opt(`${k}.hearingDate`);
  f.text('FillText122', hd ? { value: `${fmtDate(hd)}${F.opt(`${k}.hearingTime`) ? ` ${F.opt(`${k}.hearingTime`)}` : ''}`, source: s('hearingDate') } : undefined, { item: 'Caption', label: 'Hearing date and time', blankReason: 'Set by the clerk at filing' });
  f.text('FillText121', F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: 'Caption', label: 'Dept.', blankReason: 'Set by the clerk at filing' });

  // 1. petitioner
  const unit = q('soldAsUnit', 'Was other property sold as a unit with the real property? (yes/no)', 'yesno');
  f.check('CheckBox42', unit, { item: 'Title', label: 'and Sale of Other Property Sold as a Unit', source: s('soldAsUnit'), need: `${k}.soldAsUnit` });
  f.text('FillText120', pr, { item: '1', label: 'Petitioner', need: 'petitioner.name' });
  f.checkState('CheckBox43', '1', { item: '1', label: 'personal representative', source: 'Petitioner is the personal representative (case file)' });
  f.checkState('ChckBox43', null, { item: '1', label: 'conservator' });
  f.checkState('CheckBx43', null, { item: '1', label: 'guardian' });
  f.check('CheckBox44', false, { item: '1', label: 'purchaser (30 days passed)', source: 'Filed by the personal representative' });
  f.check('CheckBox47', unit, { item: '1b', label: 'confirmation of other property sold as a unit (Attachment 2c)', source: s('soldAsUnit') });
  const broker = q('broker', 'Was the purchaser procured by a licensed broker? Enter "none" or the broker name and license', 'text');
  const hasBroker = broker !== undefined && !/^none$/i.test(String(broker).trim());
  const commPct = hasBroker ? q('commissionPercent', 'Commission percent requested (LASC Rule 4.39(d): at most 5% improved, 10% raw land)', 'text') : undefined;
  f.check('CheckBox48', broker === undefined ? undefined : hasBroker, { item: '1c', label: 'approval of commission', source: s('broker'), need: `${k}.broker` });
  f.text('FillText119', commPct, { item: '1c', label: 'Commission %', source: s('commissionPercent'), blankReason: 'No broker' });
  const bid = q('amountBid', 'Amount of the accepted bid', 'money');
  f.text('FillText118', hasBroker && bid !== undefined ? { value: money(bid), source: s('amountBid') } : undefined, { item: '1c', label: 'Commission on the amount of', blankReason: 'No broker' });
  const addBond = q('additionalBond', 'Additional bond: "not required" or the amount to be fixed', 'text');
  const bondNotReq = addBond !== undefined && /not required|^0$|none/i.test(String(addBond));
  f.check('CheckBox49', addBond === undefined ? undefined : !bondNotReq, { item: '1d', label: 'additional bond is fixed at', source: s('additionalBond'), need: `${k}.additionalBond` });
  f.text('FillText117', addBond !== undefined && !bondNotReq ? { value: money(addBond), source: s('additionalBond') } : undefined, { item: '1d', label: 'Additional bond amount', blankReason: 'Not required' });
  f.check('CheckBox50', addBond === undefined ? undefined : bondNotReq, { item: '1d', label: 'is not required', source: s('additionalBond') });

  // 2. property
  const share = q('interestSold', 'Interest sold: 100, or the undivided percent', 'text');
  const full = share !== undefined && /^100%?$/.test(String(share).trim());
  f.checkState('CheckBox51', share === undefined ? undefined : (full ? '1' : '2'), { item: '2a', label: 'Interest sold: 100% / Undivided', stateLabels: { 1: '100%', 2: 'Undivided' }, source: s('interestSold'), need: `${k}.interestSold` });
  f.text('FillText116', share !== undefined && !full ? { value: String(share).replace('%', ''), source: s('interestSold') } : undefined, { item: '2a', label: 'Undivided %', blankReason: '100% sold' });
  const typ = String(P.propertyType || '');
  const improved = /home|house|condo|residence|duplex|unit|building|commercial|multi/i.test(typ) ? '1' : (/land|lot|vacant/i.test(typ) ? '2' : undefined);
  if (!improved) F.need(`${k}.improved`, ID, { label: `Sale of ${ctx.record.label}: improved or unimproved?`, type: 'choice', options: ['improved', 'unimproved'] });
  const imp = improved || ({ improved: '1', unimproved: '2' }[F.opt(`${k}.improved`)]);
  f.checkState('CheckBox53', imp, { item: '2b', label: 'Improved / Unimproved', stateLabels: { 1: 'Improved', 2: 'Unimproved' }, source: improved ? `case.assets.realProperty[${ctx.record.index}].propertyType "${typ}"` : s('improved'), need: `${k}.improved` });
  f.check('CheckBox54', unit, { item: '2c', label: 'Sold as a unit with other property', source: s('soldAsUnit') });
  const apn = P.apn ? `, APN ${P.apn}` : '';
  f.text('FillText115', P.address ? { value: `${P.address}${apn}`, source: `case.assets.realProperty[${ctx.record.index}].address/apn` } : undefined, { item: '2d', label: 'Street address and location', need: `${k}.address` });
  F.get('property.legalDescription', ID, { label: 'Legal description of the property (Attachment 2e)', type: 'text' });
  ctx.warnings.push('Attach the legal description as Attachment 2e (from the deed or title report).');

  // 3. appraisal
  const dod = F.v('decedent.dateOfDeath', ID);
  f.text('FillText112', dod ? { value: fmtDate(dod.value), source: dod.source } : undefined, { item: '3a', label: 'Date of death', need: 'decedent.dateOfDeath' });
  const appr = q('appraisedValue', 'Appraised value at date of death (from the Inventory and Appraisal)', 'money');
  f.text('FillText110', appr !== undefined ? { value: money(appr), source: s('appraisedValue') } : undefined, { item: '3b', label: 'Appraised value', need: `${k}.appraisedValue` });
  const reap = F.opt(`${k}.reappraisedValue`);
  f.text('FillText109', reap ? { value: money(reap), source: s('reappraisedValue') } : undefined, { item: '3c', label: 'Reappraised value within one year before hearing', blankReason: 'No reappraisal in file (required if the hearing is more than one year after death, 10309)' });
  f.check('CheckBox56', false, { item: '3c', label: 'Amount includes other property sold as a unit', source: 'not answered' });
  const ref = q('refereeAppraisal', 'Appraisal or reappraisal by the probate referee: "filed", "will be filed", or "waived" (with order date)', 'choice', ['filed', 'will be filed', 'waived']);
  f.checkState('CheckBox58', ref === 'filed' ? '1' : ref === 'will be filed' ? '2' : ref === undefined ? undefined : null, { item: '3d', label: 'Referee appraisal has been filed / will be filed', stateLabels: { 1: 'has been filed', 2: 'will be filed' }, source: s('refereeAppraisal'), need: `${k}.refereeAppraisal` });
  f.check('CheckBox59', ref === undefined ? undefined : ref === 'waived', { item: '3d', label: 'waived by order', source: s('refereeAppraisal') });
  f.text('FillText111', ref === 'waived' ? F.v(`${k}.refereeWaiverDate`, ID, { label: 'Date of the order waiving the referee appraisal', type: 'date' }) : undefined, { item: '3d', label: 'Waiver order date', blankReason: 'Not waived' });
  if (appr !== undefined && bid !== undefined && num(bid) < 0.9 * num(reap || appr)) ctx.warnings.push('The bid is below 90% of the appraised value: a private sale cannot be confirmed (Prob. Code 10309(a)(3)).');

  // 4. manner and terms
  f.text('FillText108', F.v(`${k}.purchaser`, ID, { label: `Sale of ${ctx.record.label}: purchaser name(s) and manner of vesting title`, type: 'text' }), { item: '4a', label: 'Purchaser and vesting', need: `${k}.purchaser` });
  const insider = q('purchaserIsInsider', 'Is the purchaser the personal representative or the attorney for the personal representative? ("no", "personal representative", "attorney")', 'choice', ['no', 'personal representative', 'attorney']);
  f.check('CheckBox60', insider === undefined ? undefined : insider !== 'no', { item: '4b', label: 'Purchaser is the PR or attorney', source: s('purchaserIsInsider'), need: `${k}.purchaserIsInsider` });
  f.checkState('CheckBox61', insider === 'personal representative' ? '1' : insider === undefined ? undefined : null, { item: '4b', label: 'personal representative', source: s('purchaserIsInsider') });
  f.checkState('ChckBox61', insider === 'attorney' ? '2' : insider === undefined ? undefined : null, { item: '4b', label: 'attorney for the PR', source: s('purchaserIsInsider') });
  const kind = q('saleKind', 'Private sale or public auction?', 'choice', ['private', 'public']);
  f.checkState('CheckBox63', kind === 'private' ? '1' : kind === 'public' ? '2' : undefined, { item: '4c', label: 'Sale was private / public', stateLabels: { 1: 'private', 2: 'public' }, source: s('saleKind'), need: `${k}.saleKind` });
  const sd = q('saleDate', 'Date of the sale (accepted offer)', 'date');
  f.text('FillText106', sd ? { value: fmtDate(sd), source: s('saleDate') } : undefined, { item: '4c', label: 'Sale date', need: `${k}.saleDate` });
  f.text('FillText107', bid !== undefined ? { value: money(bid), source: s('amountBid') } : undefined, { item: '4d', label: 'Amount bid', need: `${k}.amountBid` });
  const dep = q('deposit', 'Deposit amount', 'money');
  f.text('FillText105', dep !== undefined ? { value: money(dep), source: s('deposit') } : undefined, { item: '4d', label: 'Deposit', need: `${k}.deposit` });
  const pay = q('payment', 'Payment: cash or credit (credit terms go on Attachment 4e)', 'choice', ['cash', 'credit']);
  f.checkState('CheckBox65', pay === 'cash' ? '1' : pay === 'credit' ? '2' : undefined, { item: '4e', label: 'Cash / Credit', stateLabels: { 1: 'Cash', 2: 'Credit' }, source: s('payment'), need: `${k}.payment` });
  const other = F.opt(`${k}.otherTerms`);
  f.check('CheckBox67', !!other && !/^none$/i.test(other), { item: '4f', label: 'Other terms (Attachment 4f)', source: other ? s('otherTerms') : 'none in file' });
  const mode = F.opt(`${k}.willModeOfSale`);
  f.check('CheckBox68', !!mode, { item: '4g', label: 'Mode of sale specified in will', source: mode ? s('willModeOfSale') : 'none in file' });
  f.check('CheckBox70', false, { item: '4g', label: 'Relief from complying requested', source: 'not requested' });
  f.check('CheckBox69', false, { item: '4h', label: 'Probate Code 2542 (guardianship/conservatorship)', source: 'decedent estate' });

  // 5. commission
  f.check('CheckBox29', broker === undefined ? undefined : !hasBroker, { item: '5a', label: 'Sale without broker', source: s('broker') });
  const contract = hasBroker ? q('listingContract', 'Written listing contract: exclusive, nonexclusive, or none', 'choice', ['exclusive', 'nonexclusive', 'none']) : undefined;
  f.check('CheckBox26', contract === undefined ? (hasBroker ? undefined : false) : contract !== 'none', { item: '5b', label: 'Written contract for commission', source: s('listingContract') });
  f.checkState('CheckBox27', contract === 'exclusive' ? '1' : contract === 'nonexclusive' ? '2' : (hasBroker && contract === undefined ? undefined : null), { item: '5b', label: 'exclusive / nonexclusive', stateLabels: { 1: 'exclusive', 2: 'nonexclusive' }, source: s('listingContract') });
  f.text('FillText23', hasBroker && contract && contract !== 'none' ? F.v(`${k}.listingBroker`, ID, { label: 'Listing broker under the written contract' }) : undefined, { item: '5b', label: 'Contract with (name)', blankReason: 'No listing contract' });
  f.check('CheckBox25', broker === undefined ? undefined : hasBroker, { item: '5c', label: 'Purchaser procured by a licensed broker', source: s('broker') });
  f.text('FillText22', hasBroker ? { value: broker, source: s('broker') } : undefined, { item: '5c', label: 'Broker name', blankReason: 'No broker' });
  const split = hasBroker ? F.opt(`${k}.commissionSplit`) : undefined;
  f.check('CheckBox24', !!split, { item: '5d', label: 'Commission divided', source: split ? s('commissionSplit') : 'none in file' });
  f.text('FillText21', split ? F.v(`${k}.commissionSplit`) : undefined, { item: '5d', label: 'Division', blankReason: 'Not divided' });

  // 6. bond
  const before = q('bondBeforeSale', 'Bond amount before the sale ("none" if no bond)', 'text');
  const noBond = before !== undefined && /none|^0$/i.test(String(before));
  f.text('FillText27', before !== undefined && !noBond ? { value: money(before), source: s('bondBeforeSale') } : undefined, { item: '6a', label: 'Bond before sale', blankReason: 'None' });
  f.check('CheckBox23', before === undefined ? undefined : noBond, { item: '6a', label: 'none', source: s('bondBeforeSale'), need: `${k}.bondBeforeSale` });
  f.text('FillText26', addBond !== undefined && !bondNotReq ? { value: money(addBond), source: s('additionalBond') } : undefined, { item: '6b', label: 'Additional amount needed', blankReason: 'None' });
  f.check('CheckBox22', addBond === undefined ? undefined : bondNotReq, { item: '6b', label: 'none', source: s('additionalBond') });
  const blocked = F.opt(`${k}.blockedAccount`);
  f.check('CheckBox21', !!blocked && !/^none$/i.test(blocked), { item: '6c', label: 'Proceeds to blocked account', source: blocked ? s('blockedAccount') : 'none in file' });
  f.text('FillText20', blocked && !/^none$/i.test(blocked) ? F.v(`${k}.blockedAccount`) : undefined, { item: '6c', label: 'Institution and location', blankReason: 'No blocked account' });

  // 7. notice of sale
  const notice = q('noticeOfSale', 'Notice of sale: "published" (10300), "posted" (10301, value $5,000 or less), "will authorizes sale" or "will directs sale" (10303)', 'choice', ['published', 'posted', 'will authorizes sale', 'will directs sale']);
  f.checkState('CheckBox19', notice === 'published' ? '1' : notice === undefined ? undefined : null, { item: '7a', label: 'Published', stateLabels: { 1: 'Published' }, source: s('noticeOfSale'), need: `${k}.noticeOfSale` });
  f.checkState('ChckBox19', notice === 'posted' ? '2' : notice === undefined ? undefined : null, { item: '7a', label: 'Posted', stateLabels: { 2: 'Posted' }, source: s('noticeOfSale') });
  f.check('CheckBox18', notice === undefined ? undefined : notice === 'will authorizes sale', { item: '7b', label: 'Will authorizes sale', source: s('noticeOfSale') });
  f.check('CheckBox17', notice === undefined ? undefined : notice === 'will directs sale', { item: '7c', label: 'Will directs sale', source: s('noticeOfSale') });
  if (notice === 'published') ctx.warnings.push('LASC Local Rule 4.39(a): the sale cannot be confirmed if it took place, or this petition is filed, before the day stated in the published notice of sale.');

  // 8. notice of hearing
  const dev = q('specificDevisee', 'Specific devisee of this property: "none", "consent to be filed", or "notice will be given" (LASC Rule 4.39(b))', 'choice', ['none', 'consent to be filed', 'notice will be given']);
  f.check('CheckBox16', dev === undefined ? undefined : dev === 'none', { item: '8a(1)', label: 'None', source: s('specificDevisee'), need: `${k}.specificDevisee` });
  f.check('CheckBox14', dev === undefined ? undefined : dev === 'consent to be filed', { item: '8a(2)', label: 'Consent to be filed', source: s('specificDevisee') });
  f.check('CheckBox12', dev === undefined ? undefined : dev === 'notice will be given', { item: '8a(3)', label: 'Written notice will be given', source: s('specificDevisee') });
  f.check('CheckBox15', true, { item: '8c(1)', label: 'Petitioner (consent or notice not required)', source: 'Petitioner is the personal representative' });
  f.check('CheckBox13', false, { item: '8c(2)', source: 'Petitioner is the PR' });
  f.check('CheckBox11', false, { item: '8c(3)', source: 'Petitioner is the PR' });
  const sn = q('specialNotice', 'Requests for special notice: "none requested", "waived", or "notice will be given"', 'choice', ['none requested', 'waived', 'notice will be given']);
  f.check('CheckBox10', sn === undefined ? undefined : sn === 'none requested', { item: '8b(1)', label: 'None requested', source: s('specialNotice'), need: `${k}.specialNotice` });
  f.check('CheckBox9', sn === undefined ? undefined : sn === 'waived', { item: '8b(2)', label: 'Waived', source: s('specialNotice') });
  f.check('CheckBox8', sn === undefined ? undefined : sn === 'notice will be given', { item: '8b(3)', label: 'Notice will be given', source: s('specialNotice') });

  // 9. reason for sale (not needed when the will authorizes or directs the sale)
  const willSale = notice === 'will authorizes sale' || notice === 'will directs sale';
  const reason = willSale ? null : q('reason', 'Reason for sale: "advantage of the estate", or "necessary to pay" followed by debts / devise / family allowance / expenses / taxes', 'text');
  const r = String(reason || '').toLowerCase();
  const nec = /necessary/.test(r);
  f.check('CheckBox7', reason === undefined ? undefined : nec, { item: '9a', label: 'Necessary to pay', source: willSale ? 'item 7b/7c' : s('reason'), need: willSale ? undefined : `${k}.reason` });
  [['CheckBox6', 'debts'], ['CheckBox5', 'devise'], ['CheckBox4', 'family allowance'], ['CheckBox3', 'expenses'], ['CheckBox2', 'taxes']].forEach(([n, w]) => f.check(n, reason === undefined ? undefined : nec && r.includes(w), { item: '9a', label: w, source: s('reason') }));
  f.check('CheckBox1', reason === undefined ? undefined : /advantage/.test(r), { item: '9b', label: 'Advantage of the estate', source: s('reason') });

  // 10, 11. overbid formula (10311(a)(1)): arithmetic on the bid
  if (bid !== undefined) {
    const o = overbid(bid);
    f.text('FillText35', { value: money(bid), source: s('amountBid') }, { item: '10a', label: 'Original bid' });
    f.text('FillText34', { value: money(o.first), source: 'computed: 10% of the first $10,000 (Prob. Code 10311(a)(1))' }, { item: '10b', label: '10% of first $10,000' });
    f.text('FillText33', { value: money(o.rest), source: 'computed: 5% of the bid over $10,000 (Prob. Code 10311(a)(1))' }, { item: '10c', label: '5% of excess' });
    f.text('FillText32', { value: money(o.min), source: 'computed: 10a + 10b + 10c' }, { item: '10d', label: 'Minimum overbid' });
    f.text('FillText28', { value: money(o.min), source: 'computed: item 10d' }, { item: '11', label: 'Required first overbid' });
  } else ['FillText35', 'FillText34', 'FillText33', 'FillText32', 'FillText28'].forEach((n) => f.text(n, undefined, { item: '10', label: 'Overbid formula', need: `${k}.amountBid` }));

  // 12. marketing efforts
  const eff = F.v(`${k}.marketingEfforts`, ID, { label: `Sale of ${ctx.record.label}: efforts to obtain the highest and best price (listing, MLS, advertising, open houses)`, type: 'text' });
  f.text('FillText19', eff ? { value: `\n${eff.value}`, source: eff.source } : undefined, { item: '12', label: 'Efforts to obtain best price', need: `${k}.marketingEfforts` });
  f.text('FillText31', undefined, { item: '13', label: 'Number of pages attached', blankReason: 'Count after attachments' });
  f.text('FillText18', undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated when signed' });
  f.text('FillText30', firm.attorneyNameCaps, { item: 'Signature', label: 'Attorney name', source: SRC });
  f.text('FillText15', undefined, { item: 'Verification', label: 'Date', blankReason: 'Dated when signed' });
  f.text('FillText29', pr ? { value: pr.value.toUpperCase(), source: pr.source } : undefined, { item: 'Verification', label: 'Petitioner name', need: 'petitioner.name' });
  ctx.warnings.push('File within 30 days after the sale (Prob. Code 10308(b)); give notice of hearing on DE-120 to the 1220 persons and the purchaser (10308(c)); the clerk posts notice (1230). Overbidders in open court sign the LASC "Bid In Open Court on Sale of Real Property" form (Rule 4.39(c)).');
  if (F.opt('petition.iaeaAuthority') === 'full') ctx.warnings.push('With full IAEA authority this sale may be made without court confirmation by giving a Notice of Proposed Action (DE-165) with the material terms (Prob. Code 10503, 10511; LASC Rule 4.58(a)).');
}

module.exports = { id: ID, kind: 'jc', title: 'Report of Sale and Petition for Order Confirming Sale of Real Property', revision: 'Rev. January 1, 2006', template: 'DE-260.pdf', sourceUrl: 'https://courts.ca.gov/documents/de260.pdf', procedures: ['full'], records, fill };
