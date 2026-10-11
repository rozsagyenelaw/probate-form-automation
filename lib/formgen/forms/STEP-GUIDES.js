// Client step guides for the later out-of-app steps (decision 22): the papers for Letters, the
// notice to creditors, the state agency notices, each creditor-claim decision, each notice of
// proposed action and each notice-of-sale publication. Rendered from lib/formgen/clientSteps.js
// (the same words the client sees on the portal progress bar). One per step.
const { buildSteps } = require('../clientSteps');
const { renderStep } = require('../steprender');
const { docFields } = require('../docfields');

const ID = 'STEP-GUIDES';
const KEYS = /^(letters-papers|mail-creditor-notice|mail-agency-notices|mail-claim-decision-\d+|mail-nopa-\d+|publish-sale-\d+)$/;
const all = (F) => buildSteps({ caseData: F.caseData, answers: F.answers, phase: 11 }).filter((s) => KEYS.test(s.key));

function records(F) { return all(F).map((s) => ({ label: s.title, key: s.key })); }
function notNeeded(F) { return all(F).length ? null : 'No later steps for this procedure.'; }

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const step = all(F).find((s) => s.key === ctx.record.key);
  step.steps.forEach((t, i) => d.calc(`step.${i + 1}`, `Step ${i + 1}`, t, 'lib/formgen/clientSteps.js (sourced wording)', String(i + 1)));
  const doc = await renderStep(step, { estateName: name });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Later steps outside the app (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full'], records, notNeeded, build };
