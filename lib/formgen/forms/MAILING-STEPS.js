// Client step guides for mailing each court notice, rendered from lib/formgen/clientSteps.js (the
// same words the client sees on the portal progress bar). One per notice.
const { buildSteps } = require('../clientSteps');
const { renderStep } = require('../steprender');
const { docFields } = require('../docfields');

const ID = 'MAILING-STEPS';
const all = (F) => buildSteps({ caseData: F.caseData, answers: F.answers, phase: 11 }).filter((s) => /^mail-notices/.test(s.key));

function records(F) { return all(F).map((s) => ({ label: s.title, key: s.key })); }

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const step = all(F).find((s) => s.key === ctx.record.key);
  step.steps.forEach((t, i) => d.calc(`step.${i + 1}`, `Step ${i + 1}`, t, 'lib/formgen/clientSteps.js (sourced wording)', String(i + 1)));
  const doc = await renderStep(step, { estateName: name });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'How to have a court notice mailed (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full', '13151', '13650'], records, build };
