// Admin-only access: a Firebase ID token from project probate-california with the `admin`
// custom claim on a verified email (the same rule as firestore.rules isAdmin()).
const PROJECT = 'probate-california';
let jwks;
// Local tests only: with the Auth emulator, tokens are unsigned. This branch is impossible on
// Netlify (NETLIFY / AWS_LAMBDA_FUNCTION_NAME are set there) and needs FORMGEN_EMULATOR=1.
const EMULATOR = process.env.FORMGEN_EMULATOR === '1' && !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

async function verifyAdmin(authHeader) {
  const m = /^Bearer (.+)$/.exec(authHeader || '');
  if (!m) return { ok: false, status: 401, error: 'Sign in required' };
  if (EMULATOR) {
    try {
      const payload = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString());
      if (payload.admin !== true || payload.email_verified !== true) return { ok: false, status: 403, error: 'Admin only' };
      return { ok: true, uid: payload.sub || payload.user_id, email: payload.email, token: m[1] };
    } catch (e) { return { ok: false, status: 401, error: 'Sign in required' }; }
  }
  const { jwtVerify, createRemoteJWKSet } = require('jose');
  jwks = jwks || createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  try {
    const { payload } = await jwtVerify(m[1], jwks, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    if (payload.admin !== true || payload.email_verified !== true) return { ok: false, status: 403, error: 'Admin only' };
    return { ok: true, uid: payload.sub, email: payload.email, token: m[1] };
  } catch (e) {
    return { ok: false, status: 401, error: 'Sign in required' };
  }
}

// HOLD FOR ME: forms are drafts until Rozsa sets config/business.formsApproved = true.
// Read with the caller's own token; any failure means not approved.
async function formsApproved(token) {
  try {
    const base = EMULATOR && process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.GCLOUD_PROJECT || PROJECT}` : `https://firestore.googleapis.com/v1/projects/${PROJECT}`;
    const r = await fetch(`${base}/databases/(default)/documents/config/business`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j.fields && j.fields.formsApproved && j.fields.formsApproved.booleanValue === true);
  } catch (e) { return false; }
}

module.exports = { verifyAdmin, formsApproved, PROJECT };
