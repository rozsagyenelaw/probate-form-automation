// POST /.netlify/functions/generate  (admin only)
//   { action: 'list', caseData?, answers? }                -> { forms, procedures }
//   { action: 'generate', formId, caseData, answers, overrides, extra } -> { pdfBase64, fields, needs, warnings, draft, ... }
// The caller (portal admin) sends the case record it already reads as admin; nothing is written here.
const { generate, listForms, REGISTRY } = require('../../lib/formgen');
const { verifyAdmin, formsApproved } = require('../../lib/formgen/auth');

const ORIGINS = ['https://portal.myprobateca.com', 'https://myprobateca.com', 'http://localhost:8290', 'http://127.0.0.1:8290'];

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = cors(origin);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  const auth = await verifyAdmin(event.headers.authorization || event.headers.Authorization);
  if (!auth.ok) return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad JSON' }) }; }
  try {
    if (body.action === 'list') {
      return { statusCode: 200, headers, body: JSON.stringify({ forms: listForms(body.caseData, body.answers), procedures: REGISTRY.PROCEDURES }) };
    }
    if (body.action === 'generate') {
      const approved = await formsApproved(auth.token);
      const r = await generate({ formId: body.formId, caseData: body.caseData || {}, answers: body.answers || {}, overrides: body.overrides || {}, extra: body.extra || {}, approved });
      const { pdfBytes, ...rest } = r;
      return { statusCode: 200, headers, body: JSON.stringify({ ...rest, pdfBase64: Buffer.from(pdfBytes).toString('base64'), generatedBy: auth.email, generatedAt: new Date().toISOString() }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    console.error('generate failed', e && e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
