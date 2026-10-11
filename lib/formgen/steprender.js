// Renders one client step (lib/formgen/clientSteps.js) as a PDF guide, so the PDF and the portal
// step show the same words.
const { buildPlainDoc } = require('./plaindoc');

async function renderStep(step, { estateName, greeting }) {
  const blocks = [
    ...(greeting ? [{ type: 'para', text: greeting }] : []),
    { type: 'para', text: step.why },
    ...step.steps.map((t, i) => ({ type: 'item', n: i + 1, text: t })),
    { type: 'para', text: 'Questions at any step? Send us a message in your portal.' },
    { type: 'para', italic: true, text: `Sources (opened October 10 and 11, 2026): ${step.sources.map((x) => x.cite).join('; ')}.` },
  ];
  return buildPlainDoc({ title: [step.title, `Estate of ${estateName}`], blocks });
}

module.exports = { renderStep };
