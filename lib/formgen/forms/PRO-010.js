// LASC PRO 010 Probate Case Cover Sheet and Certificate of Grounds for Assignment to District
// (SCLAC PRO 010 Rev. 04/26, mandatory). LASC Local Rule 4.5 (edition effective July 1, 2026):
// "The first paper filed by the petitioner ... must be accompanied by ... form PRO 010."
// District per Local Rule 2.3(a)(1)(A): Central (Stanley Mosk) unless the decedent resided or the
// petitioner resides in the North District (Antelope Valley). The form itself cites "Rule 2.3(b)"
// in its last column; the rule text (edition effective July 1, 2026) has the probate filing
// rule at 2.3(a)(1)(A), so the field sheet cites that. Los Angeles only.
// Signed by the self-represented petitioner.
const { filer } = require('../filer');
const { yn } = require('../facts');

const ID = 'PRO-010';
const OPT = {
  will: ['Petition  Probate of Will (Initial) #5b3075#5d', '16', 'Petition for Probate of Will (Initial) [3075]'],
  lostWill: ['Petition  Probate of Lost Will (Initial) #5b3074#5d', '13', 'Petition for Probate of Lost Will (Initial) [3074]'],
  admin: ['Petition  Letters of Administration (Initial) #5b3069#5d', '04', 'Petition for Letters of Administration (Initial) [3069]'],
  residence: ['Petition  Determine Succession to Primary Residence (Initial) #5b3301#5d', '72', 'Determine Succession to Primary Residence [3301]'],
  spousal: ['Petition  Spousal#2fDomestic Partner Property (Initial) #5b3179#5d', '80', 'Spousal/Domestic Partner Property [3179]'],
  smallReal: ['Affidavit  Real Property of Small Value - 13200 PR Code #5b3001#5d', '91', 'Affidavit re Real Property of Small Value [3001]'],
};
// the "other statutory authority / may be filed in Central" column for each row
const OTHER_COL = { '16': '18', '13': '15', '04': '06', '72': '74', '80': '82', '91': '93' };

function kindOf(F) {
  const st = String(F.caseData.serviceType || '').toLowerCase();
  if (/simplif|13151|residence|succession/.test(st)) return { k: 'residence', src: 'case.serviceType' };
  if (/spous|13650|partner/.test(st)) return { k: 'spousal', src: 'case.serviceType' };
  if (/13200|small.?real/.test(st)) return { k: 'smallReal', src: 'case.serviceType' };
  // a small-estate case files with the court only for real property (13200 affidavit); the 13100
  // personal property affidavit is never filed, so PRO 010 is for the 13200 affidavit
  if (/small/.test(st)) return { k: 'smallReal', src: 'case.serviceType (small estate with California real property: Prob. Code 13200 affidavit)' };
  const will = F.opt('will.exists');
  if (will === false) return { k: 'admin', src: F.src('will.exists') };
  if (will === true) return { k: F.opt('will.lost') === true ? 'lostWill' : 'will', src: F.src('will.exists') };
  return undefined;
}

async function fill(f, F, ctx) {
  const county = F.opt('court.county');
  if (county && !/^los angeles$/i.test(county)) ctx.warnings.push('PRO 010 is a Los Angeles Superior Court form; this case is in another county.');
  try { f.field('01').setFontSize(14); } catch (e) { f.field('01').acroField.setDefaultAppearance('/Helv 14 Tf 0 g'); }
  const dn = F.v('decedent.name', ID);
  f.text('01', dn ? { value: `Estate of ${dn.value}, Decedent`, source: dn.source } : undefined, { item: 'Title', label: 'Title of case', need: 'decedent.name' });
  f.text('02', F.opt('case.number') ? F.v('case.number') : undefined, { item: 'Title', label: 'Case number', blankReason: 'Assigned by the clerk' });
  const kd = kindOf(F);
  if (!kd) F.need('will.exists', ID);
  const o = kd && OPT[kd.k];
  f.check('03', o ? o[0] : undefined, { item: 'Step 1', label: 'Type of action', source: kd ? `${kd.src}: ${o[2]}` : '', need: 'will.exists' });
  const north = F.opt('court.courthouse') === 'antelope-valley';
  // Step 2: reason for the district, computed (Rozsa decision D5, decisions section 25).
  // LASC Local Rule 2.3(a)(1)(A): "All Conservatorship, Guardianship, Probate, and Trust
  // proceedings must be filed in the Central District except ... Decedent's Estates when the
  // decedent resided or the Petitioner resides in the North District". So:
  //  - filed in Central: the last column ("may be filed in Central Dist. per LASC Rule 2.3"),
  //    which is true for every decedent's estate wherever the decedent lived;
  //  - filed in North: "District where decedent resided" when the decedent lived in the North
  //    District (a fact asked only then); otherwise the North filing rests on the petitioner's
  //    residence, which this row has no column for, so Central is used instead.
  const LR = 'LASC Local Rule 2.3(a)(1)(A) (Local Rules effective July 1, 2026, ch. 2; saved in build-evidence/W3-forms/sources/scope/LascCourtRules_CH2.txt)';
  let col; let colSrc;
  if (o) {
    if (!north) { col = 'central'; colSrc = `${LR}: decedent's estates are filed in the Central District; filing court ${F.opt('court.courthouse') ? F.src('court.courthouse') : 'Stanley Mosk (Central), the LASC default'}`; }
    else {
      const res = F.get('decedent.residedNorthDistrict', ID, { label: 'Did the decedent live in the North District of the Los Angeles Superior Court (Antelope Valley)?', type: 'yesno' });
      if (res === true) { col = 'resided'; colSrc = `${LR}: North District filing because the decedent resided there (${F.src('decedent.residedNorthDistrict')})`; }
      else if (res === false) { col = 'central'; colSrc = `${LR}: the decedent did not reside in the North District`; ctx.warnings.push('PRO 010: the decedent did not live in the North District; this row has no column for a petitioner-residence filing, so the Central column is marked. File in Central (Stanley Mosk) or check the North filing.'); }
    }
    f.text(o[1], col === 'resided' ? { value: 'X', source: colSrc } : undefined, { item: 'Step 2', label: 'District where decedent resided', blankReason: col ? `Not this column (${LR})` : '', need: 'decedent.residedNorthDistrict' });
    f.text(OTHER_COL[o[1]], col === 'central' ? { value: 'X', source: colSrc } : undefined, { item: 'Step 2', label: 'Other statutory authority / may be filed in Central Dist. per LASC Rule 2.3', blankReason: col ? `Not this column (${LR})` : '', need: 'decedent.residedNorthDistrict' });
  }
  // Step 3: district
  f.check('100', county && /^los angeles$/i.test(county) ? (north ? 'North (Antelope Valley)' : 'Central') : undefined, { item: 'Step 3', label: 'District', source: north ? `${F.src('court.courthouse')}; ${LR}` : `${LR}: Central unless the North District applies`, need: 'court.county' });
  f.text('101', county && /^los angeles$/i.test(county) ? (north ? 'North' : 'Central') : undefined, { item: 'Step 3', label: 'Certificate: district', source: `same as Step 3 (${LR})`, blankReason: '' });
  f.text('102', undefined, { item: 'Step 3', label: 'Date executed', blankReason: 'Dated when the petitioner signs' });
  // Step 4: interpreter
  const interp = F.get('petitioner.needsInterpreter', ID, { label: 'Does the petitioner need an interpreter in court? If yes, which language? (answer "no" or the language)', type: 'text' });
  const needI = interp === undefined ? undefined : !/^no$/i.test(String(interp).trim());
  f.check('104', interp === undefined ? undefined : (needI ? 'Yes' : 'No'), { item: 'Step 4', label: 'Filer needs an interpreter', source: F.src('petitioner.needsInterpreter'), need: 'petitioner.needsInterpreter' });
  f.text('105', needI ? { value: interp, source: F.src('petitioner.needsInterpreter') } : undefined, { item: 'Step 4', label: 'Language', blankReason: 'No interpreter' });
  f.text('107', undefined, { item: 'Step 4', label: 'Subject interpreter language', blankReason: 'Subject is the decedent' });
  // Step 5: the decedent
  f.check('108', 'Decedent', { item: 'Step 5', label: 'Subject', source: 'Decedent estate' });
  const d = F.caseData.decedent || {};
  [['110', d.firstName, 'First name'], ['111', d.lastName, 'Last name'], ['112', d.middleName, 'Middle name']].forEach(([n, v, l]) => f.text(n, v ? { value: v, source: `case.decedent.${l.split(' ')[0].toLowerCase()}Name` } : undefined, { item: 'Step 5', label: l, blankReason: 'Not in file' }));
  const aka = F.opt('decedent.aka');
  f.text('114', aka && !/^none$/i.test(aka) ? F.v('decedent.aka') : undefined, { item: 'Step 5', label: 'A.K.A.', blankReason: 'None in file' });
  const a = d.lastAddress || {};
  [['119', a.street, 'Street'], ['121', a.city, 'City'], ['122', a.state, 'State'], ['123', a.zip, 'ZIP']].forEach(([n, v, l]) => f.text(n, v ? { value: v, source: `case.decedent.lastAddress.${l.toLowerCase()}` } : undefined, { item: 'Step 5', label: `Home address: ${l}`, need: 'decedent.residence' }));
  f.check('124', !!a.street, { item: 'Step 5', label: 'Mailing address same as above', source: 'Decedent: last residence' });
  for (const n of ['113', '115', '116', '120', '125', '126', '127', '128', '129', '131', '132', '133']) f.text(n, undefined, { item: 'Step 5', blankReason: 'Not applicable to a decedent' });
  for (const n of ['117', '118']) f.check(n, false, { item: 'Step 5', source: 'Not applicable to a decedent' });
  void filer; void yn;
}

module.exports = { id: ID, kind: 'jc', title: 'LASC Probate Case Cover Sheet and Certificate of Grounds for Assignment to District', revision: 'SCLAC PRO 010 Rev. 04/26', template: 'PRO-010.pdf', sourceUrl: 'https://lascpubstorage.blob.core.windows.net/forms/Forms%20Comprehensive%20List/LASC%20PRO%20010.pdf', procedures: ['full', '13151', '13650', '13200'], fill };
