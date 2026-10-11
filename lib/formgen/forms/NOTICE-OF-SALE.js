// Notice of Sale of Real Property (published before a sale that will be returned for court
// confirmation). No Judicial Council form exists. Sources opened 2026-10-10:
// Prob. Code 10300 (publication under Gov. Code 6063a in a newspaper published in the county where
// the property is located; completed before the day stated for a private sale), 10301 (posting
// instead, value $5,000 or less), 10303 (no notice needed if the will directs or authorizes sale),
// 10304 (contents: private or public sale; place bids are received and the day on or after which
// the sale will be made; street address or legal description; optional terms), 10306 (written
// bids; private sale not before the stated day nor later than one year after), Gov. Code 6063a
// (three publications, at least 10 days). LASC Rule 4.39(a): the sale cannot be confirmed if it
// is made, or the petition filed, before the stated day.
// One notice per parcel. Text for the newspaper, plus the filing caption.
const { buildPlainDoc } = require('../plaindoc');
const { docFields } = require('../docfields');
const { capacity, prName } = require('../logic');

const ID = 'NOTICE-OF-SALE';

function records(F) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  return rp.map((p, i) => ({ label: p.address || `Parcel ${i + 1}`, parcel: p, index: i }));
}

async function build(F, ctx) {
  const d = docFields(F, ID);
  const P = ctx.record.parcel; const i = ctx.record.index; const k = `sale.${i + 1}`;
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const county = F.opt('court.county');
  const cn = d.t('case.number', { label: 'Case number' });
  const cap = capacity(F, ID); const pr = prName(F, ID);
  const capText = cap ? cap.value : '[ANSWER NEEDED: capacity]';
  const prText = pr ? pr.value : '[ANSWER NEEDED: personal representative]';
  const kind = d.raw(`${k}.saleKind`, { label: 'Private sale or public auction?', type: 'choice', options: ['private', 'public'] });
  const notice = d.raw(`${k}.noticeOfSale`, { label: 'Notice of sale: published, posted, will authorizes sale, or will directs sale', type: 'choice', options: ['published', 'posted', 'will authorizes sale', 'will directs sale'] });
  if (notice === 'will authorizes sale' || notice === 'will directs sale') ctx.warnings.push('The will authorizes or directs the sale: notice of sale is optional (Prob. Code 10303).');
  if (notice === 'posted') ctx.warnings.push('Posting instead of publication is allowed only when the Inventory and Appraisal value is $5,000 or less, posted at least 15 days before the sale date (Prob. Code 10301).');
  const addr = P.address ? `${P.address}${P.apn ? ` (APN ${P.apn})` : ''}` : '[ANSWER NEEDED: property address]';
  d.calc(`${k}.address`, 'Property (street address and APN)', addr, `case.assets.realProperty[${i}].address/apn`, '3');
  const place = d.t(`${k}.offersPlace`, { label: 'Place where written bids or offers will be received (for example, the address of the personal representative)', item: '2' });
  const onOrAfter = d.t(`${k}.saleOnOrAfter`, { label: 'Day on or after which the private sale will be made (at least the publication period after the first publication)', type: 'date', date: true, item: '2' });
  const terms = d.t(`${k}.terms`, { label: 'Terms of sale to state in the notice (cash or credit, deposit with offer, etc.)', item: '4' });
  // the newspaper is chosen per case and named only in the client's publication guide
  // (clientSteps publish-sale-N), never printed on the notice itself
  d.t(`${k}.newspaper`, { label: `Newspaper published in the county where the property is located (Prob. Code 10300(a))`, item: 'Publication guide' });
  const kindWord = kind === 'public' ? 'PUBLIC AUCTION' : kind === 'private' ? 'PRIVATE SALE' : '[ANSWER NEEDED: PRIVATE SALE or PUBLIC AUCTION]';
  const doc = await buildPlainDoc({
    preparedBy: [...require('../filer').partyLines(F, ID), `Petitioner, ${capText}, self-represented`],
    title: [`Superior Court of California, County of ${county || '[ANSWER NEEDED: county]'}`, `Estate of ${String(name)}, Deceased`, `Case No. ${cn}`, `NOTICE OF ${kindWord} OF REAL PROPERTY`],
    blocks: [
      { type: 'para', text: kind === 'public'
        ? `NOTICE IS HEREBY GIVEN that the undersigned, as ${capText} of the Estate of ${name}, deceased, will sell at public auction to the highest and best bidder, subject to confirmation by the Superior Court, at ${place}, on ${onOrAfter}, all the right, title and interest of the estate in the real property commonly known as ${addr}.`
        : `NOTICE IS HEREBY GIVEN that the undersigned, as ${capText} of the Estate of ${name}, deceased, will sell at private sale to the highest and best bidder, subject to confirmation by the Superior Court, on or after ${onOrAfter}, all the right, title and interest of the estate in the real property commonly known as ${addr}.` },
      { type: 'para', text: kind === 'public' ? `Bids may be made at the time and place of the auction stated above.` : `Bids or offers must be in writing and will be received at ${place}, or may be delivered to the ${capText} personally, at any time after the first publication of this notice and before the sale is made (Prob. Code 10306).` },
      { type: 'para', text: `Terms of sale: ${terms}.` },
      { type: 'para', text: `The sale is subject to confirmation by the Superior Court, and to overbids at the confirmation hearing as provided by law (Prob. Code 10311).` },
      { type: 'single', lines: [`Dated: ______________`, '', `${String(prText)}, ${capText.replace(/^\w/, (c) => c.toUpperCase())}`, ...require('../filer').partyLines(F, ID).slice(1)] },
    ],
  });
  ctx.warnings.push('LASC Local Rule 4.39(a): do not accept the offer, or file the DE-260, before the day stated in this notice.');
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Notice of Sale of Real Property', revision: 'Generated document (no Judicial Council form)', sourceUrl: '', procedures: ['full'], records, build };
