// Shared helpers for the procedures without full administration (13100 affidavit, 13151 primary
// residence petition, 13200 small-value real property affidavit, 13650 spousal property petition).
const { isoDate } = require('./format');
const { oneLineAddress, S } = require('./facts');
const { heirs } = require('./people');

// Dollar limits by date of death: Judicial Council form DE-300 [Rev. April 28, 2025]
// (https://courts.ca.gov/documents/de300.pdf, opened 2026-10-10), which publishes the Prob. Code 890
// adjustments; 13151 limit of $750,000 per Prob. Code 13151 / 13152 as amended by AB 2016.
const DE300 = 'DE-300 [Rev. April 28, 2025] and date of death';
const LIMITS = {
  13100: [['2022-04-01', 166250, 'a'], ['2025-04-01', 184500, 'b'], ['2028-04-01', 208850, 'c']],
  13151: [['2022-04-01', 166250, 'a'], ['2025-04-01', 184500, 'b'], ['2028-04-01', 750000, 'c']],
  13200: [['2022-04-01', 55425, 'a'], ['2025-04-01', 61500, 'b'], ['2028-04-01', 69625, 'c']],
};
// returns { amount, box: 'a'|'b'|'c', source } or undefined when the date of death is unknown or
// after the last published period
function limitFor(proc, F, form) {
  const dod = isoDate(F.get('decedent.dateOfDeath', form));
  if (!dod) return undefined;
  for (const [before, amount, box] of LIMITS[proc]) {
    if (dod < before) return { amount, box, dod, source: `${DE300} (${F.src('decedent.dateOfDeath')})`, de300: dod >= '2022-04-01' };
  }
  F.need('decedent.dateOfDeath', form, { label: 'Date of death is after the last DE-300 period: confirm the current limit', type: 'date' });
  return undefined;
}

function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// Survivors (items 9 of DE-310, 5 of DE-221): the same facts as DE-111 item 5.
function survivors(F, form) {
  const out = {};
  out.spouse = F.get('family.spouseSurvived', form);
  out.spouseSrc = F.src('family.spouseSurvived');
  const ms = F.opt('decedent.maritalStatus');
  if (out.spouse === false) {
    let r = F.opt('family.noSpouseReason'); let src = F.src('family.noSpouseReason');
    if (!r && ms) { if (ms === 'widowed') r = 'spouse deceased'; else if (ms === 'divorced' || ms === 'never married') r = 'divorced or never married'; src = F.src('decedent.maritalStatus'); }
    if (!r) F.need('family.noSpouseReason', form);
    out.noSpouseReason = r; out.noSpouseSrc = src;
  }
  let rdp = F.opt('family.rdpSurvived'); let rdpSrc = F.src('family.rdpSurvived');
  if (rdp === undefined && ms === 'registered domestic partner') { rdp = true; rdpSrc = F.src('decedent.maritalStatus'); }
  if (rdp === undefined) F.need('family.rdpSurvived', form);
  out.rdp = rdp; out.rdpSrc = rdpSrc;
  out.child = F.get('family.childSurvived', form); out.childSrc = F.src('family.childSurvived');
  out.childType = out.child === true ? F.get('family.childType', form) : undefined; out.childTypeSrc = F.src('family.childType');
  out.ipc = F.get('family.issueOfPredeceasedChild', form); out.ipcSrc = F.src('family.issueOfPredeceasedChild');
  out.step = F.get('family.stepchild', form); out.stepSrc = F.src('family.stepchild');
  out.noIssue = out.child === false && out.ipc === false;
  return out;
}

// The one parcel this procedure is about: the only parcel in the file, or the one whose address
// starts with the decedent's street address; otherwise Rozsa picks it.
function residenceParcel(F, form) {
  const rp = (F.caseData.assets && F.caseData.assets.realProperty) || [];
  if (!rp.length) { F.need('estate.realProperty', form, { label: 'Real property for this petition (address, APN, value): none in the file', type: 'text' }); return undefined; }
  const pick = F.opt('property.parcelIndex');
  if (pick !== undefined && rp[Number(pick) - 1]) return { p: rp[Number(pick) - 1], i: Number(pick) - 1, source: F.src('property.parcelIndex') };
  if (rp.length === 1) return { p: rp[0], i: 0, source: 'case.assets.realProperty[0] (only parcel in file)' };
  const st = S(F.caseData.decedent && F.caseData.decedent.lastAddress && F.caseData.decedent.lastAddress.street).toLowerCase();
  const hit = st ? rp.findIndex((p) => S(typeof p.address === 'string' ? p.address : oneLineAddress(p.address)).toLowerCase().startsWith(st)) : -1;
  if (hit >= 0) return { p: rp[hit], i: hit, source: `case.assets.realProperty[${hit}] (address matches case.decedent.lastAddress)` };
  F.need('property.parcelIndex', form, { label: `Which parcel is the subject of this petition? (1 to ${rp.length}, in the order of the real property list)`, type: 'text' });
  return undefined;
}

function parcelAddress(p) { return typeof p.address === 'string' ? p.address : oneLineAddress(p.address); }

// Successors from the file: living heirs with a share above zero (case.heirs[].sharePercentage).
function successors(F, form) {
  return heirs(F, form).filter((h) => !h.deceased && Number(String(h.share).replace(/[^0-9.]/g, '')) > 0);
}

module.exports = { limitFor, daysBetween, survivors, residenceParcel, parcelAddress, successors, LIMITS };
