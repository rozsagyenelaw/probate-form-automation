// Server-side admin check for the older generate-de* endpoints (W1-security item 16), using
// W3-forms' verifyAdmin (Firebase ID token, admin claim on a verified email, jose JWT check).
const { verifyAdmin } = require('../../lib/formgen/auth');

async function requireAdmin(event) {
  const r = await verifyAdmin(event.headers.authorization || event.headers.Authorization);
  return r.ok ? { ok: true, uid: r.uid } : { ok: false, status: r.status, error: r.error };
}
module.exports = { requireAdmin };
