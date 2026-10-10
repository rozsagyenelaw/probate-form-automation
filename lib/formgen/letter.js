const { embed: embedFont } = require('./fonts');
// Office letter on letterhead (legal-document-standards: firm name bold and centred, address,
// phone and email, a rule underneath; date; recipient block single spaced; bold RE line;
// body at 1.5 spacing with first-line indent; signature block; enclosures in italics).
// No fax line (house rule).
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const firm = require('./firm');
const { sanitize } = require('./pleading');

async function buildLetter({ date, recipient = [], re = [], body = [], closing = 'Very truly yours,', enclosures = [], cc = [] }) {
  const doc = await PDFDocument.create();
  const reg = await embedFont(doc, 'TimesRoman');
  const bold = await embedFont(doc, 'TimesRomanBold');
  const ital = await embedFont(doc, 'TimesRomanItalic');
  const W = 612; const H = 792; const L = 72; const R = 540; const size = 12;
  let page; let y;
  const center = (t, font, s) => { const w = font.widthOfTextAtSize(t, s); page.drawText(t, { x: (W - w) / 2, y, size: s, font }); };
  const newPage = (first) => {
    page = doc.addPage([W, H]); y = H - 72;
    if (first) {
      center(firm.firmNameCaps, bold, 14); y -= 16;
      center(`${firm.street}, ${firm.cityStateZip()}`, reg, 11); y -= 13;
      center(`Telephone: ${firm.phone}   Email: ${firm.email}`, reg, 11); y -= 8;
      page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: rgb(0, 0, 0) }); y -= 28;
    }
  };
  const wrap = (text, font, width) => {
    const out = [];
    for (const para of sanitize(text).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t; }
      out.push(line);
    }
    return out;
  };
  const need = (h) => { if (y - h < 72) newPage(false); };
  newPage(true);
  page.drawText(sanitize(date || ''), { x: L, y, size, font: reg }); y -= 28;
  for (const l of recipient) { need(14); page.drawText(sanitize(l), { x: L, y, size, font: reg }); y -= 14; }
  y -= 14;
  re.forEach((l, i) => { need(14); page.drawText(sanitize(i === 0 ? `RE:  ${l}` : l), { x: i === 0 ? L : L + 36, y, size, font: bold }); y -= 14; });
  y -= 14;
  for (const p of body) {
    const lines = wrap(p, reg, R - L - 36);
    const first = wrap(p, reg, R - L - 36)[0] || '';
    const rest = sanitize(p).slice(first.length).trim();
    const all = [{ t: first, x: L + 36 }, ...(rest ? wrap(rest, reg, R - L) : []).map((t) => ({ t, x: L }))];
    for (const l of all) { need(18); page.drawText(l.t, { x: l.x, y, size, font: reg }); y -= 18; }
    void lines; y -= 6;
  }
  y -= 10; need(90);
  page.drawText(closing, { x: L, y, size, font: reg }); y -= 50;
  for (const l of [firm.attorneyName, firm.firmName]) { page.drawText(l, { x: L, y, size, font: reg }); y -= 14; }
  y -= 14;
  if (enclosures.length) { need(14 * (enclosures.length + 1)); page.drawText('Enclosures:', { x: L, y, size: 11, font: ital }); y -= 13; for (const e of enclosures) { page.drawText(sanitize(e), { x: L + 18, y, size: 11, font: ital }); y -= 13; } }
  if (cc.length) { y -= 6; for (const c of cc) { page.drawText(sanitize(`cc: ${c}`), { x: L, y, size: 11, font: reg }); y -= 13; } }
  return doc;
}

module.exports = { buildLetter };
