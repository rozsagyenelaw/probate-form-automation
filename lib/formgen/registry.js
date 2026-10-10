// Every form and document the generator produces. forms/all.js lists them with static
// requires (so the Netlify bundler includes them); scripts/build-registry.js regenerates it.
const FORMS = require('./forms/all');
const PROCEDURES = require('./procedures.json');
module.exports = { FORMS, PROCEDURES };
