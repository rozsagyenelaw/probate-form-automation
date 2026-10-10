// Small estate affidavit for personal property (Prob. Code 13100 to 13116). No Judicial Council
// form exists (selfhelp.courts.ca.gov/probate/small-estate, opened 2026-10-10). One affidavit per
// holder of property. Every 13101(a)(1) to (11) statement uses the statute's own wording
// (sources/statutes/PROB-13101.txt, leginfo opened 2026-10-10); 13101(b) allows the wording to be
// modified for more than one affiant. Attachments: certified death certificate (13101(d)), DE-300
// for deaths on or after 4/1/2022 (13101(f)), PR consent and letters if any (13101(e)), and an
// inventory and appraisal of any California real property (13103). Nothing is filed in court.
// The notary acknowledgment is not drafted here: the notary attaches their own certificate.
const { buildPlainDoc } = require('../plaindoc');
const { docFields } = require('../docfields');
const { longDate, money, num, isoDate } = require('../format');
const { limitFor, daysBetween, successors } = require('../smallestate');

const ID = 'SMALL-ESTATE-AFFIDAVIT';
const S = (v) => (v === undefined || v === null ? '' : String(v)).trim();

// How each account is titled decides whether it passes by this affidavit. Accounts with a
// payable-on-death or transfer-on-death beneficiary, a joint owner or a trust title are not
// collected with it (Prob. Code 13050); the title is asked, never assumed.
const TITLES = ['the decedent alone', 'payable-on-death or transfer-on-death beneficiary', 'a joint owner', 'a trust'];
const titleKey = (x, i) => `asset.${x.id || `fa${i + 1}`}.title`;
function records(F) {
  const a = F.caseData.assets || {};
  const out = [];
  (a.financialAccounts || []).forEach((x, i) => {
    const t = F.opt(titleKey(x, i));
    if (t && t !== 'the decedent alone') return; // passes outside this affidavit
    out.push({ label: `${S(x.institutionName) || 'Financial account'} ${S(x.accountType)} ${S(x.accountNumber)}`.replace(/\s+/g, ' ').trim(), kind: 'account', i, item: x, source: `case.assets.financialAccounts[${i}]` });
  });
  // vehicles are not collected with this affidavit: Prob. Code 13050(b)(1) excludes registered
  // vehicles; the DMV has its own transfer procedure
  (a.personalProperty || []).forEach((x, i) => out.push({ label: `Property: ${S(x.description)}`, kind: 'personal', i, item: x, source: `case.assets.personalProperty[${i}]` }));
  return out;
}

function describe(r) {
  const x = r.item;
  if (r.kind === 'account') return `${S(x.accountType) || 'Account'} account${S(x.accountNumber) ? ` number ${S(x.accountNumber)}` : ''} held by ${S(x.institutionName) || '[ANSWER NEEDED: institution]'}${r.titleKnown ? ' in the name of the decedent alone' : ''}, with all funds on deposit and accrued interest.`;
  if (r.kind === 'vehicle') return `${[x.year, x.make, x.model].map(S).filter(Boolean).join(' ')} motor vehicle${S(x.vin) ? `, VIN ${S(x.vin)}` : ''}${S(x.licensePlate) ? `, California license plate ${S(x.licensePlate)}` : ''}.`;
  return `${S(x.description)}${S(x.location) ? ` (located at: ${S(x.location)})` : ''}.`;
}

async function build(F, ctx) {
  const d = docFields(F, ID);
  const r = ctx.record;
  const succ = successors(F, ID);
  const names = F.opt('smallEstate.affiants') || (succ.length ? succ.map((h) => h.name).join(', ') : undefined);
  const namesSrc = F.opt('smallEstate.affiants') ? F.src('smallEstate.affiants') : 'case.heirs[] living with a share (sharePercentage)';
  if (!names) F.need('smallEstate.affiants', ID, { label: 'Affiants: name of each successor (Prob. Code 13006) signing the affidavit', type: 'text' });
  d.calc('smallEstate.affiants', 'Affiants (successors)', names, namesSrc, 'Affiants');
  const affList = names ? names.split(/\s*,\s*/) : [];
  const multi = affList.length > 1;

  const holder = F.opt('smallEstate.holder') || (r.kind === 'account' ? S(r.item.institutionName) : undefined);
  if (!holder) F.need('smallEstate.holder', ID, { label: `Holder of the property for "${r.label}" (to whom the affidavit is given)`, type: 'text' });
  d.calc('smallEstate.holder', 'Holder of the property', holder, F.opt('smallEstate.holder') ? F.src('smallEstate.holder') : `${r.source}.institutionName`, 'To');
  if (r.kind === 'account') {
    const t = F.get(titleKey(r.item, r.i), ID, { label: `How is the account "${r.label}" titled? (the decedent alone, a payable-on-death or transfer-on-death beneficiary, a joint owner, or a trust)`, type: 'choice', options: TITLES });
    r.titleKnown = t === 'the decedent alone';
    d.calc(titleKey(r.item, r.i), 'Account title', t, F.src(titleKey(r.item, r.i)), '6');
  }
  if ((F.caseData.assets && (F.caseData.assets.vehicles || []).length)) ctx.warnings.push('Vehicles in the file are not included: a registered vehicle is excluded from the small estate (Prob. Code 13050(b)(1)); it transfers at the DMV with form REG 5 (Affidavit for Transfer Without Probate; Veh. Code 5910).');

  const name = d.t('decedent.name', { label: 'Decedent name', item: '1' });
  const aka = F.opt('decedent.aka');
  const dod = d.t('decedent.dateOfDeath', { label: 'Date of death', date: true, item: '2' });
  const place = d.t('decedent.placeOfDeath', { label: 'Place of death', item: '2' });
  const dodIso = isoDate(F.opt('decedent.dateOfDeath'));
  if (dodIso) { const days = daysBetween(dodIso, isoDate(ctx.now)); if (days < 40) ctx.warnings.push(`Only ${days} days have passed since the death; the affidavit may not be used until 40 days have elapsed (Prob. Code 13100).`); }

  const admin = F.get('estate.caAdministration', ID, { label: 'Has any proceeding for administration of the estate been conducted, or is one being conducted, in California?', type: 'yesno' });
  d.calc('estate.caAdministration', 'Administration in California', admin === undefined ? undefined : (admin ? 'yes' : 'no'), F.src('estate.caAdministration'), '4');
  const stmt4 = admin === undefined ? '[ANSWER NEEDED: whether any administration proceeding exists in California]'
    : admin === false ? '"No proceeding is now being or has been conducted in California for administration of the decedent\'s estate."'
      : `"The decedent's personal representative has consented in writing to the payment, transfer, or delivery to the ${multi ? 'affiants or declarants' : 'affiant or declarant'} of the property described in the affidavit or declaration."`;
  if (admin === true) ctx.warnings.push("Attach a copy of the personal representative's written consent and letters (Prob. Code 13101(e)).");

  const lim = limitFor(13100, F, ID);
  d.calc('smallEstate.limit', 'Dollar amount (13101(g))', lim ? `$${lim.amount.toLocaleString('en-US')}` : undefined, lim ? lim.source : '', '5');
  const a = F.caseData.assets || {};
  // total of California property counted toward the limit: vehicles and accounts that pass outside
  // probate (13050) are left out; an account whose title is not yet answered is counted
  const fileTotal = (a.financialAccounts || []).reduce((t, x, i) => { const tt = F.opt(titleKey(x, i)); return t + (tt && tt !== 'the decedent alone' ? 0 : num(x.estimatedValue)); }, 0)
    + ['personalProperty', 'realProperty'].reduce((s2, k) => s2 + (a[k] || []).reduce((t, x) => t + num(x.estimatedValue), 0), 0);
  d.calc('smallEstate.fileTotal', 'California property counted toward the limit (from the file)', `$${money(fileTotal)}`, 'sum of accounts titled to the decedent (or not yet answered), personal property and real property; vehicles excluded (13050(b)(1))', '5');
  if (lim && fileTotal > lim.amount) ctx.warnings.push(`Statement 5: the estimated California property in the file totals $${money(fileTotal)}, above $${money(lim.amount)}. Before using this affidavit, confirm what is excluded under Prob. Code 13050 (for example joint tenancy, payable-on-death and trust assets) and 13151; otherwise the affidavit is not available.`);
  if ((a.realProperty || []).length) ctx.warnings.push('The file shows California real property: an inventory and appraisal of it by a probate referee must be attached (Prob. Code 13103). The affidavit transfers personal property only (13115).');

  const descEdit = F.opt('smallEstate.propertyDescription');
  const desc = d.calc('smallEstate.propertyDescription', 'Description of the property', descEdit || describe(r), descEdit ? F.src('smallEstate.propertyDescription') : r.source, '6');
  const capacityStmt = F.opt('smallEstate.affiantCapacity') === '13051'
    ? `"The ${multi ? 'affiants or declarants are' : 'affiant or declarant is'} authorized under Section 13051 of the California Probate Code to act on behalf of the successor of the decedent (as defined in Section 13006 of the California Probate Code) with respect to the decedent's interest in the described property."`
    : `"The ${multi ? 'affiants or declarants are the successors' : 'affiant or declarant is the successor'} of the decedent (as defined in Section 13006 of the California Probate Code) to the decedent's interest in the described property."`;
  d.calc('smallEstate.affiantCapacity', 'Statement 8 (successor or 13051 authority)', F.opt('smallEstate.affiantCapacity') || 'successor', F.opt('smallEstate.affiantCapacity') ? F.src('smallEstate.affiantCapacity') : 'affiants are the successors in case.heirs', '8');

  const blocks = [
    { type: 'single', lines: [`To: ${holder || '[ANSWER NEEDED: holder of the property]'}`] },
    { type: 'para', text: `The undersigned, ${names || '[ANSWER NEEDED: affiants]'}, ${multi ? 'declare' : 'declares'} as follows:` },
    { type: 'item', n: 1, text: `The decedent's name: ${name}${aka && !/^none$/i.test(aka) ? ` (also known as ${aka})` : ''}.` },
    { type: 'item', n: 2, text: `The date and place of the decedent's death: ${dod}, at ${place}.` },
    { type: 'item', n: 3, text: '"At least 40 days have elapsed since the death of the decedent, as shown in a certified copy of the decedent\'s death certificate attached to this affidavit or declaration."' },
    { type: 'item', n: 4, text: stmt4 },
    { type: 'item', n: 5, text: `"The current gross fair market value of the decedent's real and personal property in California, excluding the property described in Section 13050 of the California Probate Code and any property included in a petition filed under Section 13151 of the California Probate Code, does not exceed ${lim ? `$${lim.amount.toLocaleString('en-US')}` : '[ANSWER NEEDED: dollar amount under 13101(g)]'}."` },
    { type: 'item', n: 6, text: `Description of the property of the decedent that is to be paid, transferred, or delivered to the ${multi ? 'affiants or declarants' : 'affiant or declarant'}: ${desc}` },
    { type: 'item', n: 7, text: `The name of the successor of the decedent, as defined in Section 13006, to the described property: ${names || '[ANSWER NEEDED: successor]'}.` },
    { type: 'item', n: 8, text: capacityStmt },
    { type: 'item', n: 9, text: '"No other person has a superior right to the interest of the decedent in the described property."' },
    { type: 'item', n: 10, text: `"The ${multi ? 'affiants or declarants request' : 'affiant or declarant requests'} that the described property be paid, delivered, or transferred to the ${multi ? 'affiants or declarants' : 'affiant or declarant'}."` },
    { type: 'item', n: 11, text: `"The ${multi ? 'affiants or declarants affirm or declare' : 'affiant or declarant affirms or declares'} under penalty of perjury under the laws of the State of California that the foregoing is true and correct."` },
    ...(affList.length ? affList : ['[ANSWER NEEDED: affiant]']).map((n) => ({ type: 'signature', name: n })),
    { type: 'space', h: 10 },
    { type: 'box', bold: true, space: 28, text: 'Attach notary acknowledgment. (Each affiant must give the holder reasonable proof of identity, Prob. Code 13104(a).)' },
    { type: 'para', italic: true, text: `Attached: certified copy of the decedent's death certificate (Prob. Code 13101(d))${lim && lim.de300 ? '; Judicial Council form DE-300, list of adjusted dollar amounts in effect on the date of death (Prob. Code 13101(f))' : ''}${admin === true ? "; personal representative's written consent and letters (Prob. Code 13101(e))" : ''}${(a.realProperty || []).length ? '; inventory and appraisal of California real property (Prob. Code 13103)' : ''}.` },
  ];
  const doc = await buildPlainDoc({
    title: ['AFFIDAVIT FOR COLLECTION OF PERSONAL PROPERTY', '(California Probate Code Sections 13100 to 13116)'],
    blocks,
  });
  return { doc, fields: d.fields };
}

module.exports = {
  id: ID, kind: 'doc', title: 'Small Estate Affidavit (Personal Property)', revision: 'Prob. Code 13101 as amended by Stats. 2024, ch. 331 (AB 2016), eff. Jan. 1, 2025; no Judicial Council form',
  sourceUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=13101', procedures: ['13100'],
  note: 'One affidavit per holder of property. Not filed in court.', records, build,
};
