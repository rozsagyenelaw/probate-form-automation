// DE-111 Petition for Probate (Rev. July 1, 2017).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { fmtDate, money, num } = require('../format');
const { oneLineAddress } = require('../facts');
const { appendTableAttachment } = require('../attach');

const P1 = 'topmostSubform[0].Page1[0].';
const H1 = `${P1}StdP1Header_sf[0].FormTitle[0].`;
const P2 = 'topmostSubform[0].Page2[0].Page2[0].';
const P3 = 'topmostSubform[0].Page3[0].';
const P4 = 'topmostSubform[0].Page4[0].';
const ID = 'DE-111';

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);

  const willExists = F.get('will.exists', ID);
  const iaea = F.get('petition.iaeaAuthority', ID);
  const isExec = willExists === true ? F.get('petitioner.isNamedExecutor', ID) : undefined;
  // capacity: executor / administrator with will annexed / administrator
  let capacity;
  if (willExists === false) capacity = 'administrator';
  else if (willExists === true && isExec === true) capacity = 'executor';
  else if (willExists === true && isExec === false) capacity = 'administrator with will annexed';
  const capSrc = willExists === false ? F.src('will.exists') : `${F.src('will.exists')}; ${F.src('petitioner.isNamedExecutor')}`;

  // caption title boxes
  f.check(`${H1}CheckBox23[0]`, capacity === undefined ? undefined : capacity === 'executor', { item: 'Title', label: 'Probate of Will and for Letters Testamentary', source: capSrc, need: 'will.exists' });
  f.check(`${H1}CheckBox22[0]`, capacity === undefined ? undefined : capacity === 'administrator with will annexed', { item: 'Title', label: 'Probate of Will and for Letters of Administration with Will Annexed', source: capSrc });
  f.check(`${H1}CheckBox21[0]`, capacity === undefined ? undefined : capacity === 'administrator', { item: 'Title', label: 'Letters of Administration', source: capSrc });
  const lost = willExists === true ? F.get('will.lost', ID) : false;
  f.check(`${H1}CheckBox23[1]`, capacity === 'executor' && lost === true, { item: 'Title', label: 'Lost Will (Letters Testamentary)', source: F.src('will.lost') });
  f.check(`${H1}CheckBox23[2]`, capacity === 'administrator with will annexed' && lost === true, { item: 'Title', label: 'Lost Will (with Will Annexed)', source: F.src('will.lost') });
  f.check(`${H1}CheckBox19[0]`, iaea === undefined ? undefined : iaea !== 'none', { item: 'Title', label: 'Authorization to Administer Under the IAEA', source: F.src('petition.iaeaAuthority'), need: 'petition.iaeaAuthority' });
  f.check(`${H1}CheckBox18[0]`, iaea === undefined ? undefined : iaea === 'limited', { item: 'Title', label: 'with limited authority', source: F.src('petition.iaeaAuthority') });
  const hd = F.opt('hearing.date');
  f.text('topmostSubform[0].Page1[0].StdP1Header_sf[0].CaseNumber[1].CaseNumber_ft[0]', hd ? { value: `${fmtDate(hd)}${F.opt('hearing.time') ? ` ${F.opt('hearing.time')}` : ''}`, source: F.src('hearing.date') } : undefined, { item: 'Caption', label: 'Hearing date and time', blankReason: 'Set by the clerk at filing' });
  f.text('topmostSubform[0].Page1[0].StdP1Header_sf[0].CaseNumber[1].FillText121[0]', F.opt('hearing.dept') ? F.v('hearing.dept') : undefined, { item: 'Caption', label: 'Dept.', blankReason: 'Set by the clerk at filing' });

  // 1. publication
  f.text(`${P1}FillText141[0]`, F.v('petition.newspaper', ID), { item: '1', label: 'Newspaper', need: 'petition.newspaper' });
  const pub = F.get('petition.publicationArranged', ID);
  f.check(`${P1}CheckBox1[0]`, pub === undefined ? undefined : pub === 'requested', { item: '1a', label: 'Publication requested', source: F.src('petition.publicationArranged'), need: 'petition.publicationArranged' });
  f.check(`${P1}CheckBox1[1]`, pub === undefined ? undefined : pub === 'arranged', { item: '1b', label: 'Publication to be arranged', source: F.src('petition.publicationArranged') });

  // 2. petitioner and requests
  const pn = F.v('petitioner.name', ID);
  f.text(`${P1}FillText142[0]`, pn, { item: '2', label: 'Petitioner (name each)', need: 'petitioner.name' });
  f.check(`${P1}CheckBox3[0]`, willExists, { item: '2a', label: 'Will and codicils be admitted to probate', source: F.src('will.exists'), need: 'will.exists' });
  f.text(`${P1}FillText143[0]`, pn, { item: '2b', label: 'Name to be appointed', need: 'petitioner.name' });
  f.check(`${P1}CheckBox5[0]`, capacity === undefined ? undefined : capacity === 'executor', { item: '2b(1)', label: 'executor', source: capSrc });
  f.check(`${P1}CheckBox6[0]`, capacity === undefined ? undefined : capacity === 'administrator with will annexed', { item: '2b(2)', label: 'administrator with will annexed', source: capSrc });
  f.check(`${P1}CheckBox7[0]`, capacity === undefined ? undefined : capacity === 'administrator', { item: '2b(3)', label: 'administrator', source: capSrc });
  f.check(`${P1}CheckBox12[0]`, iaea === undefined ? undefined : iaea === 'full', { item: '2c', label: 'full IAEA authority', source: F.src('petition.iaeaAuthority') });
  f.check(`${P1}CheckBox12[1]`, iaea === undefined ? undefined : iaea === 'limited', { item: '2c', label: 'limited IAEA authority', source: F.src('petition.iaeaAuthority') });

  // bond (2d, 3e)
  const hs = heirs(F, ID);
  const waives = willExists === true ? F.get('will.waivesBond', ID) : false;
  const allHeirsWaived = hs.length > 0 && hs.filter((h) => !h.deceased).every((h) => h.waivedBond && h.adult);
  let bondReason; // '3e1' | '3e2' | '3e3' | undefined
  if (waives === true) bondReason = '3e1';
  else if (allHeirsWaived && willExists === true) bondReason = '3e2';
  else if (allHeirsWaived && willExists === false) bondReason = '3e3';
  const bondKnown = waives !== undefined;
  f.check(`${P1}CheckBox11[0]`, bondKnown ? !!bondReason : undefined, { item: '2d(1)', label: 'bond not be required (item 3e)', source: bondReason === '3e1' ? F.src('will.waivesBond') : 'case.heirs[].waivedBond (all adult heirs)', need: 'will.waivesBond' });
  if (bondKnown && !bondReason) {
    const amt = F.v('petition.bondAmount', ID);
    f.check(`${P1}CheckBox13[0]`, true, { item: '2d(2)', label: 'bond be fixed', source: 'no waiver in file' });
    f.text(`${P1}FillText144[0]`, amt ? { value: money(amt.value), source: amt.source } : undefined, { item: '2d(2)', label: 'Bond amount', need: 'petition.bondAmount' });
  } else {
    f.check(`${P1}CheckBox13[0]`, false, { item: '2d(2)', label: 'bond be fixed' });
    f.text(`${P1}FillText144[0]`, undefined, { item: '2d(2)', label: 'Bond amount', blankReason: 'Bond waived' });
  }
  const blocked = F.opt('petition.blockedAccount');
  const hasBlocked = blocked && !/^none$/i.test(String(blocked).trim());
  f.check(`${P1}CheckBox14[0]`, !!hasBlocked, { item: '2d(3)', label: 'blocked account', source: hasBlocked ? F.src('petition.blockedAccount') : 'none in file' });
  f.text(`${P1}FillText161[0]`, hasBlocked ? F.v('petition.blockedAccount') : undefined, { item: '2d(3)', label: 'Blocked account institution and location', blankReason: 'No blocked account' });
  f.text(`${P1}FillText145[0]`, undefined, { item: '2d(3)', label: 'Blocked account amount', blankReason: hasBlocked ? 'Amount is part of the institution text' : 'No blocked account' });

  // 3a-c decedent
  f.text(`${P1}FillText146[0]`, F.get('decedent.dateOfDeath', ID) ? { value: fmtDate(F.get('decedent.dateOfDeath')), source: F.src('decedent.dateOfDeath') } : undefined, { item: '3a', label: 'Date of death', need: 'decedent.dateOfDeath' });
  f.text(`${P1}FillText147[0]`, F.v('decedent.placeOfDeath', ID), { item: '3a', label: 'Place of death', need: 'decedent.placeOfDeath' });
  const caRes = F.get('decedent.caResident', ID);
  const resCounty = F.opt('decedent.residenceCounty');
  const crtCounty = F.opt('court.county');
  const inCounty = caRes === true && resCounty && crtCounty && resCounty.toLowerCase() === crtCounty.toLowerCase();
  f.check(`${P1}CheckBox15[0]`, caRes === undefined ? undefined : !!inCounty, { item: '3a(1)', label: 'resident of the county named above', source: `${F.src('decedent.caResident')}; ${F.src('decedent.residenceCounty')} = ${F.src('court.county')}`, need: 'decedent.caResident' });
  f.check(`${P1}CheckBox15[1]`, caRes === undefined ? undefined : caRes === false, { item: '3a(2)', label: 'nonresident of California', source: F.src('decedent.caResident') });
  if (caRes === false) f.text(`${P1}FillText148[0]`, F.v('estate.nonresidentLocation', ID, { label: 'Nonresident decedent: location of the estate in this county (permits publication)' }), { item: '3a(2)', label: 'Location of estate in county', need: 'estate.nonresidentLocation' });
  else f.text(`${P1}FillText148[0]`, undefined, { item: '3a(2)', label: 'Location of estate in county', blankReason: 'Decedent was a resident' });
  const foreign = F.opt('decedent.foreignCitizen');
  f.check(`${P1}CheckBox81[0]`, foreign === undefined ? undefined : foreign === true, { item: '3b', label: 'Citizen of another country', source: F.src('decedent.foreignCitizen'), need: 'decedent.foreignCitizen' });
  if (foreign === undefined) F.need('decedent.foreignCitizen', ID);
  f.text(`${P1}TextField3g5[0]`, foreign === true ? F.v('decedent.citizenshipCountry', ID) : undefined, { item: '3b', label: 'Country', blankReason: 'United States citizen', need: foreign === true ? 'decedent.citizenshipCountry' : undefined });
  const res = F.v('decedent.residence', ID);
  f.text(`${P1}FillText149[0]`, res ? { value: `${oneLineAddress(res.value)}${resCounty ? `, County of ${resCounty}` : ''}`, source: `${res.source}; ${F.src('decedent.residenceCounty')}` } : undefined, { item: '3c', label: 'Residence at death (street, city, county)', need: 'decedent.residence' });

  // 3d values
  let pp = F.get('estate.personalProperty', ID);
  // accounts that pass outside probate (payable-on-death, joint, trust) are not estate property:
  // the title is asked for each account the file does not already mark (review fix L)
  if (pp !== undefined && F.src('estate.personalProperty').startsWith('sum of')) {
    const NONPROB = /pod|tod|payable|transfer on death|joint|trust/i;
    let excluded = 0;
    ((F.caseData.assets && F.caseData.assets.financialAccounts) || []).forEach((x, i) => {
      const key = `asset.${x.id || `fa${i + 1}`}.title`;
      const t = F.opt(key);
      if (NONPROB.test(String(x.ownershipType || '')) || (t && t !== 'the decedent alone')) excluded += Number(String(x.estimatedValue || 0).replace(/[^0-9.-]/g, '')) || 0;
      else if (!t && !x.ownershipType) F.need(key, ID, { label: `How is the account at ${x.institutionName || 'the bank'} titled? (the decedent alone, a payable-on-death or transfer-on-death beneficiary, a joint owner, or a trust)`, type: 'choice', options: ['the decedent alone', 'payable-on-death or transfer-on-death beneficiary', 'a joint owner', 'a trust'] });
    });
    if (excluded) { pp -= excluded; ctx.warnings.push(`Item 3d(1) leaves out $${money(excluded)} in accounts that pass outside probate (payable-on-death, joint or trust).`); }
  }
  const ir = F.get('estate.incomeReal', ID);
  const ip = F.get('estate.incomePersonal', ID);
  const hasReal = F.get('estate.hasRealProperty', ID);
  const rg = hasReal === false ? 0 : F.get('estate.realGross', ID);
  const re = hasReal === false ? 0 : F.get('estate.realEncumbrances', ID);
  const mv = (v, key) => (v === undefined ? undefined : { value: money(v), source: hasReal === false && /^estate\.real/.test(key) ? 'case.assets.realProperty is empty' : F.src(key) });
  f.text(`${P2}FillText162[0]`, mv(pp, 'estate.personalProperty'), { item: '3d(1)', label: 'Personal property', need: 'estate.personalProperty' });
  f.text(`${P2}FillText165[0]`, mv(ir, 'estate.incomeReal'), { item: '3d(2)(a)', label: 'Annual gross income from real property', need: 'estate.incomeReal' });
  f.text(`${P2}FillText164[0]`, mv(ip, 'estate.incomePersonal'), { item: '3d(2)(b)', label: 'Annual gross income from personal property', need: 'estate.incomePersonal' });
  const sub = [pp, ir, ip].every((x) => x !== undefined) ? num(pp) + num(ir) + num(ip) : undefined;
  f.text(`${P2}FillText163[0]`, sub === undefined ? undefined : { value: money(sub), source: 'computed: 3d(1) + 3d(2)(a) + 3d(2)(b)' }, { item: '3d(3)', label: 'Subtotal', need: 'estate values above' });
  f.text(`${P2}FillText173[0]`, mv(rg, 'estate.realGross'), { item: '3d(4)', label: 'Gross fair market value of real property', need: 'estate.realGross' });
  f.text(`${P2}FillText173[1]`, mv(re, 'estate.realEncumbrances'), { item: '3d(5)', label: 'Encumbrances', need: 'estate.realEncumbrances' });
  const net = rg !== undefined && re !== undefined ? Math.max(0, num(rg) - num(re)) : undefined;
  f.text(`${P2}FillText178[0]`, net === undefined ? undefined : { value: money(net), source: 'computed: 3d(4) - 3d(5)' }, { item: '3d(6)', label: 'Net value of real property' });
  f.text(`${P2}FillText177[0]`, sub !== undefined && net !== undefined ? { value: money(sub + net), source: 'computed: 3d(3) + 3d(6)' } : undefined, { item: '3d(7)', label: 'Total' });

  // 3e
  f.check(`${P2}CheckBox73[0]`, bondKnown ? bondReason === '3e1' : undefined, { item: '3e(1)', label: 'Will waives bond', source: F.src('will.waivesBond') });
  f.check(`${P2}CheckBox72[0]`, false, { item: '3e(1)', label: 'Special administrator is named executor and will waives bond', source: 'no special administration requested' });
  f.check(`${P2}CheckBox74[0]`, bondKnown ? bondReason === '3e2' : undefined, { item: '3e(2)', label: 'All beneficiaries adults and waived bond', source: 'case.heirs[].waivedBond' });
  f.check(`${P2}CheckBox75[0]`, bondKnown ? bondReason === '3e3' : undefined, { item: '3e(3)', label: 'All heirs adults and waived bond', source: 'case.heirs[].waivedBond' });
  f.check(`${P2}CheckBox76[0]`, false, { item: '3e(4)', label: 'Corporate fiduciary', source: 'petitioner is an individual (case.petitioner)' });
  if (bondReason === '3e2' || bondReason === '3e3') ctx.warnings.push('Bond waivers (DE-142) must be signed by every heir/beneficiary and affixed as Attachment 3e(2)/3e(3).');

  // 3f will
  f.check(`${P2}CheckBox77[0]`, willExists === undefined ? undefined : willExists === false, { item: '3f(1)', label: 'Decedent died intestate', source: F.src('will.exists') });
  f.check(`${P2}CheckBox78[0]`, willExists, { item: '3f(2)', label: 'Copy of will affixed', source: F.src('will.exists') });
  if (willExists === true) {
    const wd = F.get('will.date', ID);
    f.text(`${P2}FillText179[0]`, wd ? { value: fmtDate(wd), source: F.src('will.date') } : undefined, { item: '3f(2)', label: 'Will dated', need: 'will.date' });
    const cod = F.get('will.codicilDates', ID);
    const hasCod = cod !== undefined && !/^none$/i.test(String(cod).trim());
    f.check(`${P2}CheckBox79[0]`, cod === undefined ? undefined : hasCod, { item: '3f(2)', label: 'codicil dated', source: F.src('will.codicilDates'), need: 'will.codicilDates' });
    f.text(`${P2}FillText181[0]`, hasCod ? F.v('will.codicilDates') : undefined, { item: '3f(2)', label: 'Codicil dates', blankReason: 'No codicil' });
    const sp = F.get('will.selfProving', ID);
    f.check(`${P2}CheckBox57[0]`, sp, { item: '3f(2)', label: 'Will and codicils self-proving', source: F.src('will.selfProving'), need: 'will.selfProving' });
    f.check(`${P2}CheckBox57[1]`, lost, { item: '3f(3)', label: 'Original will lost', source: F.src('will.lost'), need: 'will.lost' });
    ctx.warnings.push('Attachment 3f(2): affix a copy of the will (and any codicil) before filing.');
  } else {
    for (const n of ['FillText179[0]', 'FillText181[0]']) f.text(`${P2}${n}`, undefined, { item: '3f(2)', blankReason: 'No will' });
    for (const n of ['CheckBox79[0]', 'CheckBox57[0]', 'CheckBox57[1]']) f.check(`${P2}${n}`, false, { item: '3f', source: 'No will' });
  }

  // 3g appointment
  const execOnly = capacity === 'executor';
  const wwa = capacity === 'administrator with will annexed';
  f.check(`${P2}CheckBox58[0]`, capacity === undefined ? undefined : execOnly, { item: '3g(1)(a)', label: 'Proposed executor named in will and consents', source: F.src('petitioner.isNamedExecutor') });
  if (wwa) {
    const ground = F.get('petition.wwaGround', ID, { label: 'Administrator with will annexed: why? (no executor named / named executor(s) will not act: death, declination, other / petitioner is a nominee)', type: 'choice', options: ['no executor named', 'executor deceased', 'executor declined', 'other reason', 'nominee'] });
    f.check(`${P2}CheckBox59[0]`, ground === undefined ? undefined : ground === 'no executor named', { item: '3g(1)(b)', label: 'No executor named in will', source: F.src('petition.wwaGround'), need: 'petition.wwaGround' });
    f.check(`${P2}CheckBox60[0]`, ground === undefined ? undefined : ground === 'nominee', { item: '3g(1)(c)', label: 'Nominee of person entitled', source: F.src('petition.wwaGround') });
    const notAct = ground && /executor (deceased|declined)|other reason/.test(ground);
    f.check(`${P2}CheckBox61[0]`, ground === undefined ? undefined : !!notAct, { item: '3g(1)(d)', label: 'Other named executors will not act', source: F.src('petition.wwaGround') });
    f.check(`${P2}CheckBox63[0]`, ground === 'executor deceased', { item: '3g(1)(d)', label: 'death', source: F.src('petition.wwaGround') });
    f.check(`${P2}CheckBox62[0]`, ground === 'executor declined', { item: '3g(1)(d)', label: 'declination', source: F.src('petition.wwaGround') });
    f.check(`${P2}CheckBox64[0]`, ground === 'other reason', { item: '3g(1)(d)', label: 'other reasons', source: F.src('petition.wwaGround') });
    f.text(`${P2}FillText182[0]`, ground === 'other reason' ? F.v('petition.wwaOtherReason', ID, { label: 'Other reason the named executor will not act' }) : undefined, { item: '3g(1)(d)', label: 'Other reasons (specify)', blankReason: 'Not applicable' });
  } else {
    for (const n of ['CheckBox59[0]', 'CheckBox60[0]', 'CheckBox61[0]', 'CheckBox63[0]', 'CheckBox62[0]', 'CheckBox64[0]']) f.check(`${P2}${n}`, false, { item: '3g(1)', source: capacity ? `capacity: ${capacity}` : 'capacity unknown' });
    f.text(`${P2}FillText182[0]`, undefined, { item: '3g(1)(d)', blankReason: 'Not applicable' });
  }
  f.check(`${P2}CheckBox65[0]`, false, { item: '3g(1)(d)', label: 'Continued in Attachment 3g(1)(d)' });
  if (capacity === 'administrator') {
    const ent = F.get('petitioner.isEntitledToLetters', ID);
    f.check(`${P2}CheckBox66[0]`, ent, { item: '3g(2)(a)', label: 'Petitioner is a person entitled to Letters', source: F.src('petitioner.isEntitledToLetters'), need: 'petitioner.isEntitledToLetters' });
    f.check(`${P2}CheckBox67[0]`, ent === undefined ? undefined : ent === false, { item: '3g(2)(b)', label: 'Petitioner is a nominee', source: F.src('petitioner.isEntitledToLetters') });
    const rel = F.v('petitioner.relationship', ID);
    f.check(`${P2}CheckBox68[0]`, !!rel, { item: '3g(2)(c)', label: 'Petitioner related to decedent as', source: rel ? rel.source : '' });
    f.text(`${P2}FillTxt181[0]`, rel, { item: '3g(2)(c)', label: 'Relationship', need: 'petitioner.relationship' });
  } else {
    for (const n of ['CheckBox66[0]', 'CheckBox67[0]', 'CheckBox68[0]']) f.check(`${P2}${n}`, false, { item: '3g(2)', source: 'Will case (item 3g(2) is for administrators)' });
    f.text(`${P2}FillTxt181[0]`, undefined, { item: '3g(2)(c)', blankReason: 'Will case' });
  }
  f.check(`${P2}CheckBox69[0]`, false, { item: '3g(3)', label: 'Special administrator requested', source: 'not requested' });
  f.check(`${P2}CheckBox61[1]`, false, { item: '3g(4)', label: 'Successor personal representative', source: 'not a successor petition' });

  // 3h residence of proposed PR
  const prCa = F.get('petitioner.caResident', ID);
  f.check(`${P2}CheckBox70[0]`, prCa, { item: '3h(1)', label: 'PR resident of California', source: F.src('petitioner.caResident'), need: 'petitioner.caResident' });
  f.check(`${P2}CheckBox70[1]`, prCa === undefined ? undefined : prCa === false, { item: '3h(2)', label: 'PR nonresident of California', source: F.src('petitioner.caResident') });
  const pa = F.opt('petitioner.address');
  f.text(`${P2}FillText183[0]`, prCa === false && pa ? { value: oneLineAddress(pa), source: F.src('petitioner.address') } : undefined, { item: '3h(2)', label: 'Permanent address', blankReason: 'PR is a California resident' });
  const us = prCa === true ? true : F.get('petitioner.usResident', ID);
  f.check(`${P2}CheckBox81[0]`, us, { item: '3h(3)', label: 'PR resident of the United States', source: prCa === true ? 'derived: California resident (case.petitioner.isCAResident)' : F.src('petitioner.usResident'), need: 'petitioner.usResident' });
  f.check(`${P2}CheckBox81[1]`, us === undefined ? undefined : us === false, { item: '3h(4)', label: 'PR nonresident of the United States', source: F.src('petitioner.usResident') });

  // 4 IAEA not precluded
  if (willExists === true) {
    const pre = F.get('will.precludesIAEA', ID);
    f.check(`${P3}CheckBox56[0]`, pre === undefined ? undefined : pre === false, { item: '4', label: "Will does not preclude IAEA", source: F.src('will.precludesIAEA'), need: 'will.precludesIAEA' });
  } else f.check(`${P3}CheckBox56[0]`, false, { item: '4', source: 'No will' });

  // 5 survivors
  const sp = F.get('family.spouseSurvived', ID);
  const ms = F.opt('decedent.maritalStatus');
  f.check(`${P3}CheckBox55[0]`, sp, { item: '5a(1)', label: 'spouse', source: F.src('family.spouseSurvived'), need: 'family.spouseSurvived' });
  f.check(`${P3}CheckBox55[1]`, sp === undefined ? undefined : sp === false, { item: '5a(2)', label: 'no spouse', source: F.src('family.spouseSurvived') });
  let noSp;
  if (sp === false) {
    noSp = F.opt('family.noSpouseReason');
    let nsSrc = F.src('family.noSpouseReason');
    if (!noSp && ms) { if (ms === 'widowed') noSp = 'spouse deceased'; else if (ms === 'divorced' || ms === 'never married') noSp = 'divorced or never married'; nsSrc = F.src('decedent.maritalStatus'); }
    if (!noSp) F.need('family.noSpouseReason', ID);
    f.check(`${P3}CheckBox53[0]`, noSp === undefined ? undefined : noSp === 'divorced or never married', { item: '5a(2)(a)', label: 'divorced or never married', source: nsSrc, need: 'family.noSpouseReason' });
    f.check(`${P3}CheckBox52[0]`, noSp === undefined ? undefined : noSp === 'spouse deceased', { item: '5a(2)(b)', label: 'spouse deceased', source: nsSrc });
  } else {
    f.check(`${P3}CheckBox53[0]`, false, { item: '5a(2)(a)', source: 'spouse survived or unknown' });
    f.check(`${P3}CheckBox52[0]`, false, { item: '5a(2)(b)', source: 'spouse survived or unknown' });
  }
  let rdp = F.opt('family.rdpSurvived');
  let rdpSrc = F.src('family.rdpSurvived');
  if (rdp === undefined && ms === 'registered domestic partner') { rdp = true; rdpSrc = F.src('decedent.maritalStatus'); }
  if (rdp === undefined) F.need('family.rdpSurvived', ID);
  f.check(`${P3}CheckBox51[0]`, rdp, { item: '5a(3)', label: 'registered domestic partner', source: rdpSrc, need: 'family.rdpSurvived' });
  f.check(`${P3}CheckBox51[1]`, rdp === undefined ? undefined : rdp === false, { item: '5a(4)', label: 'no registered domestic partner', source: rdpSrc });
  const ch = F.get('family.childSurvived', ID);
  f.check(`${P3}CheckBox49[0]`, ch, { item: '5a(5)', label: 'child', source: F.src('family.childSurvived'), need: 'family.childSurvived' });
  const ct = ch === true ? F.get('family.childType', ID) : undefined;
  f.check(`${P3}CheckBox48[0]`, ch === true ? (ct === undefined ? undefined : ct !== 'natural adopted by a third party') : false, { item: '5a(5)(a)', label: 'natural or adopted', source: F.src('family.childType'), need: 'family.childType' });
  f.check(`${P3}CheckBox47[0]`, ch === true ? (ct === undefined ? undefined : ct !== 'natural or adopted') : false, { item: '5a(5)(b)', label: 'natural adopted by a third party', source: F.src('family.childType') });
  f.check(`${P3}CheckBox49[1]`, ch === undefined ? undefined : ch === false, { item: '5a(6)', label: 'no child', source: F.src('family.childSurvived') });
  const ipc = F.get('family.issueOfPredeceasedChild', ID);
  f.check(`${P3}CheckBox45[0]`, ipc, { item: '5a(7)', label: 'issue of a predeceased child', source: F.src('family.issueOfPredeceasedChild'), need: 'family.issueOfPredeceasedChild' });
  f.check(`${P3}CheckBox45[1]`, ipc === undefined ? undefined : ipc === false, { item: '5a(8)', label: 'no issue of a predeceased child', source: F.src('family.issueOfPredeceasedChild') });
  const step = F.get('family.stepchild', ID);
  f.check(`${P3}CheckBox43[0]`, step, { item: '5b', label: 'was survived by stepchild/foster child', source: F.src('family.stepchild'), need: 'family.stepchild' });
  f.check(`${P3}CheckBox43[1]`, step === undefined ? undefined : step === false, { item: '5b', label: 'was not', source: F.src('family.stepchild') });

  // 6 and 7
  const noIssue = ch === false && ipc === false;
  const item6Boxes = { a: 'CheckBox41[0]', b: 'CheckBox40[0]', c: 'CheckBox39[0]', d: 'CheckBox38[0]', e: 'CheckBox37[0]', f: 'CheckBox36[0]', g: 'CheckBox35[0]', h: 'CheckBox34[0]' };
  const i6 = noIssue ? F.get('family.item6', ID) : undefined;
  for (const [k, n] of Object.entries(item6Boxes)) f.check(`${P3}${n}`, noIssue ? (i6 === undefined ? undefined : i6 === k) : false, { item: `6${k}`, source: noIssue ? F.src('family.item6') : 'Not applicable: decedent survived by issue (or unknown)', need: noIssue ? 'family.item6' : undefined });
  const noSpouseNoIssue = noIssue && sp === false && rdp === false;
  const i7 = noSpouseNoIssue ? String(F.get('family.item7', ID) || '').toLowerCase().replace(/\s+/g, '') : '';
  const i7boxes = [
    ['CheckBox33[0]', /^a/], ['CheckBox33[1]', /^b/], ['CheckBox31[0]', /^b\(?1/], ['CheckBox31[1]', /^b\(?2/],
    ['CheckBox29[0]', /\(a\)$/], ['CheckBox28[0]', /\(b\)$/], ['CheckBox27[0]', /\(c\)$/], ['CheckBox26[0]', /\(d\)$/], ['CheckBox25[0]', /\(e\)$/], ['CheckBox24[0]', /^b\(?3/],
  ];
  for (const [n, re] of i7boxes) f.check(`${P3}${n}`, noSpouseNoIssue ? (i7 ? re.test(i7) : undefined) : false, { item: '7', source: noSpouseNoIssue ? F.src('family.item7') : 'Not applicable: spouse or issue survived (or unknown)', need: noSpouseNoIssue ? 'family.item7' : undefined });

  // 8 heirs (10 rows; more go to Attachment 8)
  F.get('family.heirsListComplete', ID);
  const rowOrder = [0, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const fitsOnForm = hs.length <= 10;
  rowOrder.forEach((idx, row) => {
    const h = fitsOnForm ? hs[row] : undefined;
    f.text(`${P4}FillText352[${idx}]`, h ? { value: `${h.name}\n${h.relationship}${h.deceased ? ' (deceased)' : ''}`, source: `${h.nameSource}; ${h.relSource}` } : undefined, { item: `8 row ${row + 1}`, label: 'Name and relationship', blankReason: fitsOnForm ? 'no more heirs' : 'See Attachment 8' });
    f.text(`${P4}FillText351[${idx}]`, h && h.age ? { value: h.age, source: h.ageSource } : undefined, { item: `8 row ${row + 1}`, label: 'Age', blankReason: h ? (h.deceased ? 'Deceased' : 'NEEDS ANSWER: age') : '' , need: h && !h.age && !h.deceased ? `${h.key}.age` : undefined });
    f.text(`${P4}FillText350[${idx}]`, h && h.address ? { value: h.address, source: h.addrSource } : undefined, { item: `8 row ${row + 1}`, label: 'Address', need: h && !h.address ? `${h.key}.address` : undefined, blankReason: fitsOnForm ? 'no more heirs' : 'See Attachment 8' });
  });
  f.check(`${P4}CheckBox83[0]`, !fitsOnForm, { item: '8', label: 'Continued on Attachment 8', source: `${hs.length} persons in case.heirs` });
  if (!fitsOnForm) {
    ctx.after = async (doc) => appendTableAttachment(doc, {
      estate: (F.opt('decedent.name') || ''), caseNumber: F.opt('case.number') || '', formId: ID, title: 'ATTACHMENT 8',
      intro: 'Names, relationships to decedent, ages, and addresses of the persons described in item 8.',
      columns: [{ title: 'Name and relationship', width: 200 }, { title: 'Age', width: 50 }, { title: 'Address', width: 290 }],
      rows: hs.map((h) => [`${h.name}, ${h.relationship}${h.deceased ? ' (deceased)' : ''}`, h.age, h.address]),
    });
  }
  f.text(`${P4}FillText277[0]`, undefined, { item: '9', label: 'Number of pages attached', blankReason: 'Count after the will copy and waivers are attached' });
  f.text(`${P4}FillText276[0]`, undefined, { item: 'Signature', label: 'Date (attorney)', blankReason: 'Dated when signed' });
  f.text(`${P4}FillText358[0]`, undefined, { item: 'Signature', label: 'Attorney name', blankReason: 'Self-represented petitioner: no attorney signs' });
  f.text(`${P4}FillText276[1]`, undefined, { item: 'Verification', label: 'Date (petitioner)', blankReason: 'Dated when signed' });
  f.text(`${P4}FillText357[0]`, pn ? { value: pn.value, source: pn.source } : undefined, { item: 'Verification', label: 'Petitioner name', need: 'petitioner.name' });
  f.text(`${P4}FillText357[1]`, undefined, { item: 'Verification', label: 'Second petitioner', blankReason: 'One petitioner in file' });
  f.check(`${P4}CheckBox82[0]`, false, { item: 'Verification', label: 'Additional petitioners follow', source: 'One petitioner in file' });
}

module.exports = {
  id: ID, kind: 'jc', title: 'Petition for Probate', revision: 'Rev. July 1, 2017', template: 'DE-111.pdf',
  sourceUrl: 'https://courts.ca.gov/documents/de111.pdf', procedures: ['full'],
  fill: async (f, F, ctx) => { await fill(f, F, ctx); },
  after: async (doc, F, ctx) => { if (ctx.after) await ctx.after(doc); },
};
