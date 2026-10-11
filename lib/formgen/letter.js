const { embed: embedFont } = require('./fonts');
// Letter (date; recipient block single spaced; bold RE line;
// body at 1.5 spacing with first-line indent; signature block; enclosures in italics).
// No fax line (house rule).
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { sanitize } = require('./pleading');

// sender: { lines: [name, street, city/state/zip, phone, email], signName, signTitle } -- the
// personal representative (or will custodian) writes in their own name; there is no law-firm
// letterhead (Rozsa's decision of 2026-10-10: her office is not attorney of record).
// The RE block: the first line starts with "RE:" at the left margin, every other line (and every wrapped part) is
// indented; nothing runs past the right margin R, however long a court name or an "[ANSWER NEEDED: ...]" placeholder is.
function layoutRe(re, font, size, L, R) {
  const out = [];
  const fit = (text, width) => {
    const lines = []; let line = '';
    for (const w of sanitize(text).split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    // a single word wider than the line (a long placeholder without spaces) is cut at the margin
    return lines.flatMap((l) => {
      if (font.widthOfTextAtSize(l, size) <= width) return [l];
      const parts = []; let cur = '';
      for (const ch of l) { if (font.widthOfTextAtSize(cur + ch, size) > width && cur) { parts.push(cur); cur = ch; } else cur += ch; }
      if (cur) parts.push(cur);
      return parts;
    });
  };
  re.forEach((l, i) => {
    const indent = L + 36;
    if (i === 0) {
      const lead = 'RE:  ';
      const lines = fit(l, R - L - font.widthOfTextAtSize(lead, size));
      lines.forEach((t, j) => out.push({ t: j === 0 ? lead + t : t, x: j === 0 ? L : indent }));
    } else fit(l, R - indent).forEach((t) => out.push({ t, x: indent }));
  });
  return out;
}

async function buildLetter({ sender, date, recipient = [], re = [], body = [], closing = 'Sincerely,', enclosures = [], cc = [] }) {
  if (!sender) throw new Error('buildLetter: sender is required');
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
      for (const l of sender.lines) { page.drawText(sanitize(l), { x: L, y, size: 11, font: reg }); y -= 13; }
      y -= 18;
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
  for (const { t, x } of layoutRe(re, bold, size, L, R)) { need(14); page.drawText(t, { x, y, size, font: bold }); y -= 14; }
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
  for (const l of [sender.signName, sender.signTitle].filter(Boolean)) { page.drawText(sanitize(l), { x: L, y, size, font: reg }); y -= 14; }
  y -= 14;
  if (enclosures.length) { need(14 * (enclosures.length + 1)); page.drawText('Enclosures:', { x: L, y, size: 11, font: ital }); y -= 13; for (const e of enclosures) { page.drawText(sanitize(e), { x: L + 18, y, size: 11, font: ital }); y -= 13; } }
  if (cc.length) { y -= 6; for (const c of cc) { page.drawText(sanitize(`cc: ${c}`), { x: L, y, size: 11, font: reg }); y -= 13; } }
  return doc;
}

module.exports = { buildLetter, layoutRe };
