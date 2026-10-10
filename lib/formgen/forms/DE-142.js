// DE-142 / DE-111(A-3e) Waiver of Bond by Heir or Beneficiary (Rev. July 1, 2017). Prob. Code 8481.
// One form per adult heir or beneficiary; each signs their own. A minor or incapacitated person
// needs a guardian ad litem or other authorized representative (form paragraph F).
const { header, caption, petitionerFor } = require('../header');
const { heirs } = require('../people');
const { prName } = require('../logic');

const ID = 'DE-142';
const P = 'topmostSubform[0].Page1[0].';

function records(F) {
  return heirs(F, ID).filter((h) => !h.deceased).map((h) => ({ label: `${h.name}${h.adult ? '' : ' (minor: needs a guardian ad litem)'}`, heir: h }));
}

async function fill(f, F, ctx) {
  header(f, F, { attorneyFor: petitionerFor(F, ID) });
  caption(f, F);
  const h = ctx.record.heir;
  f.check(`${P}StdP1Header_sf[0].FormTitle[0].#area[0].Attach3d_cb[0]`, true, { item: 'Title', label: 'Attachment 3e to Petition for Probate', source: 'Filed with DE-111' });
  const pr = prName(F, ID);
  f.text(`${P}NamePersRep_tx[0]`, pr, { item: '4', label: 'Name of personal representative', need: 'petitioner.name' });
  f.text(`${P}Date1_tx[0]`, undefined, { item: 'Signature', label: 'Date', blankReason: 'Dated by the heir when signing' });
  f.text(`${P}SignerName_tx[0]`, { value: h.name.toUpperCase(), source: h.nameSource }, { item: 'Signature', label: 'Name of beneficiary' });
  f.text(`${P}P1Footer[0].CurrPg_no[0]`, undefined, { item: 'Footer', blankReason: 'Page number set when attached to DE-111' });
  f.text(`${P}P1Footer[0].TotalPg_no[0]`, undefined, { item: 'Footer', blankReason: 'Page number set when attached to DE-111' });
  if (F.opt('will.waivesBond') === true) ctx.warnings.push('The will waives bond (case.bondWaivedInWill), so heir waivers are not needed for this case (Prob. Code 8481(a)(1)).');
  if (!h.adult) ctx.warnings.push(`${h.name} is not an adult in the file: a guardian ad litem or other authorized person must sign (DE-142 paragraph F).`);
}

module.exports = { id: ID, kind: 'jc', title: 'Waiver of Bond by Heir or Beneficiary', revision: 'Rev. July 1, 2017', template: 'DE-142.pdf', sourceUrl: 'https://courts.ca.gov/documents/de142.pdf', procedures: ['full'], records, fill };
