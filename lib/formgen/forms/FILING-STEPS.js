// Client step guide rendered from lib/formgen/clientSteps.js (the same words the client sees on
// the portal progress bar, cases/{caseId}/clientSteps). Sources are listed on the guide.
const { buildSteps } = require('../clientSteps');
const { renderStep } = require('../steprender');
const { docFields } = require('../docfields');

const ID = 'FILING-STEPS';

function notNeeded(F) {
  const st = buildSteps({ caseData: F.caseData, answers: F.answers, phase: 11 });
  return st.some((s) => /^(file-petition|file-papers|use-affidavit)$/.test(s.key)) ? null : 'Not part of this procedure.';
}

async function build(F) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name' });
  const step = buildSteps({ caseData: F.caseData, answers: F.answers, phase: 11 }).find((s) => /^(file-petition|file-papers|use-affidavit)$/.test(s.key));
  step.steps.forEach((t, i) => d.calc(`step.${i + 1}`, `Step ${i + 1}`, t, 'lib/formgen/clientSteps.js (sourced wording)', String(i + 1)));
  const doc = await renderStep(step, { estateName: name });
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'How to file your court papers (client steps)', revision: 'Client guide (generated)', sourceUrl: '', procedures: ['full', '13151', '13650', '13100', '13200'], notNeeded, build };
