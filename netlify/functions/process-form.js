// Legacy endpoint used by the generator's own questionnaire page. It now runs the same engine
// as the portal admin (lib/formgen): DE-111, DE-121 (the notice of petition; DE-120 is not used
// for a petition to administer), DE-140, DE-147 and DE-150, on the current Judicial Council
// revisions, watermarked DRAFT until Rozsa approves, admin sign-in required.
// The previous implementation is kept for reference in process-form.legacy.txt.
const { generate } = require('../../lib/formgen');
const { legacyToEngine } = require('../../lib/formgen/legacy');
const { verifyAdmin, formsApproved } = require('../../lib/formgen/auth');

const FORMS = ['DE-111', 'DE-121', 'DE-140', 'DE-147', 'DE-150'];
const ORIGINS = ['https://probateformautomation.netlify.app', 'https://portal.myprobateca.com', 'http://localhost:8290'];

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Cache-Control': 'no-store' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  const auth = await verifyAdmin(event.headers.authorization || event.headers.Authorization);
  if (!auth.ok) return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  try {
    const { caseData, answers } = legacyToEngine(JSON.parse(event.body || '{}'));
    const approved = await formsApproved(auth.token);
    const pdfs = {}; const needs = {};
    for (const id of FORMS) {
      const r = await generate({ formId: id, caseData, answers, approved });
      pdfs[id] = Buffer.from(r.pdfBytes).toString('base64');
      for (const n of r.needs) needs[n.key] = n.question;
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, draft: !approved, pdfs, needs, forms_generated: FORMS }) };
  } catch (e) {
    console.error('process-form failed', e && e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process form' }) };
  }
};
