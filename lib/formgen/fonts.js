// Embedded fonts for generated documents, so every PDF prints the same everywhere (court
// e-filing systems expect embedded fonts). Liberation Serif is metric-compatible with
// Times New Roman (same widths and line breaks); Liberation Sans with Arial/Helvetica.
// Liberation fonts: SIL Open Font License 1.1 (redistributable).
const fs = require('fs'); const path = require('path');
const fontkit = require('@pdf-lib/fontkit');
const DIRS = [process.env.FORMGEN_FONTS, path.join(__dirname, 'fonts'), path.join(process.cwd(), 'lib', 'formgen', 'fonts'), process.env.LAMBDA_TASK_ROOT && path.join(process.env.LAMBDA_TASK_ROOT, 'lib', 'formgen', 'fonts')].filter(Boolean);
const cache = {};
function bytes(name) {
  if (cache[name]) return cache[name];
  for (const d of DIRS) { const p = path.join(d, `${name}.ttf`); if (fs.existsSync(p)) return (cache[name] = fs.readFileSync(p)); }
  throw new Error(`Font ${name} not found`);
}
const MAP = { TimesRoman: 'LiberationSerif-Regular', TimesRomanBold: 'LiberationSerif-Bold', TimesRomanItalic: 'LiberationSerif-Italic', Helvetica: 'LiberationSans-Regular', HelveticaBold: 'LiberationSans-Bold' };
async function embed(doc, which, opts = {}) {
  doc.registerFontkit(fontkit);
  return doc.embedFont(bytes(MAP[which]), { subset: opts.subset !== false });
}
module.exports = { embed };
