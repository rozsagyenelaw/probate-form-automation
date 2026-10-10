// Firebase web config for the admin sign-in gate (W1-security item 16). The API key is the public
// web key of project probate-california; it is kept in this site's environment, not in the repo.
exports.handler = async () => ({
  statusCode: process.env.FIREBASE_WEB_API_KEY ? 200 : 500,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  body: JSON.stringify({
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: 'probate-california.firebaseapp.com',
    projectId: 'probate-california',
    storageBucket: 'probate-california.firebasestorage.app'
  })
});
