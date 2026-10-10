// Admin sign-in gate for the MyProbateCA form generator (W1-security item 16, 2026-10-10).
// The page stays covered until someone signs in with an account that has the `admin` claim on a
// verified email (the same rule as the Firestore rules). Exposes window.mpcaAdmin for the page:
//   await mpcaAdmin.ready            -> resolves once an admin is signed in
//   await mpcaAdmin.idToken()        -> fresh Firebase ID token for the server functions
//   await mpcaAdmin.getCase(caseId)  -> the case document (read under the admin security rules)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Firebase web config comes from this site's settings (kept out of the repository)
const config = await fetch('/.netlify/functions/firebase-config').then((r) => r.json());
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const overlay = document.createElement('div');
overlay.id = 'mpca-admin-gate';
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-modal', 'true');
overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f3f4f6;display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;';
overlay.innerHTML = `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;max-width:380px;width:100%;padding:24px;box-sizing:border-box;">
    <p style="margin:0;font-size:13px;color:#6b7280;">Law Offices of Rozsa Gyene</p>
    <h1 style="margin:6px 0 4px;font-size:20px;color:#111827;">Attorney sign in</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">This form tool is for the office only.</p>
    <form id="mpca-gate-form">
      <label style="display:block;font-size:13px;color:#374151;">Email<input id="mpca-gate-email" type="email" autocomplete="username" required style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;"></label>
      <label style="display:block;font-size:13px;color:#374151;margin-top:10px;">Password<input id="mpca-gate-password" type="password" autocomplete="current-password" required style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;"></label>
      <button type="submit" style="margin-top:14px;width:100%;padding:12px;border:0;border-radius:8px;background:#1e3a8a;color:#fff;font-weight:600;font-size:15px;">Sign in</button>
    </form>
    <button id="mpca-gate-google" type="button" style="margin-top:10px;width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;font-weight:600;font-size:15px;">Continue with Google</button>
    <p id="mpca-gate-msg" role="status" style="margin:12px 0 0;font-size:14px;color:#b91c1c;min-height:1em;"></p>
  </div>`;
const mount = () => { if (!document.getElementById('mpca-admin-gate')) document.body.appendChild(overlay); };
if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
const msg = (t) => { const el = overlay.querySelector('#mpca-gate-msg'); if (el) el.textContent = t; };

let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });

overlay.querySelector('#mpca-gate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg('');
  try {
    await signInWithEmailAndPassword(auth, overlay.querySelector('#mpca-gate-email').value.trim(), overlay.querySelector('#mpca-gate-password').value);
  } catch (err) {
    msg('That email and password did not work.');
  }
});
overlay.querySelector('#mpca-gate-google').addEventListener('click', async () => {
  msg('');
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    msg(err.code === 'auth/unauthorized-domain' ? 'Google sign-in is not set up for this page yet. Use email and password.' : 'Google sign-in did not complete.');
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { mount(); return; }
  const { claims } = await user.getIdTokenResult(true);
  if (claims.admin === true && claims.email_verified === true) {
    overlay.remove();
    resolveReady(user);
  } else {
    await signOut(auth);
    mount();
    msg('This account does not have office access.');
  }
});

window.mpcaAdmin = {
  ready,
  idToken: async () => (await ready).getIdToken(),
  getCase: async (caseId) => {
    await ready;
    const snap = await getDoc(doc(db, 'cases', caseId));
    if (!snap.exists()) throw new Error('Case not found');
    return { id: snap.id, ...snap.data() };
  },
  signOut: () => signOut(auth).then(() => location.reload())
};
// Pages that started before this module finished loading wait for this event
window.dispatchEvent(new Event('mpca-admin-gate-ready'));
