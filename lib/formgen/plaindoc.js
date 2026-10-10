const { embed: embedFont } = require('./fonts');
// Plain document (affidavits and declarations given to third parties, not filed in court):
// US Letter, 1 inch margins, Times New Roman 12, bold centred title, numbered paragraphs at
// 1.5 spacing, signature blocks. No dashes other than hyphens (house rule).
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { sanitize } = require('./pleading');

async function buildPlainDoc({ preparedBy, title = [], blocks = [] }) {
  const doc = await PDFDocument.create();
  const reg = await embedFont(doc, 'TimesRoman');
  const bold = await embedFont(doc, 'TimesRomanBold');
  const ital = await embedFont(doc, 'TimesRomanItalic');
  const W = 612; const H = 792; const L = 72; const R = 540; const size = 12; const lead = 18;
  let page; let y; let pageNo = 0;
  const footer = () => { const t = `Page ${pageNo}`; page.drawText(t, { x: (W - reg.widthOfTextAtSize(t, 9)) / 2, y: 40, size: 9, font: reg }); };
  const newPage = () => { page = doc.addPage([W, H]); pageNo += 1; y = H - 72; footer(); };
  const wrap = (text, font, width, s = size) => {
    const out = [];
    for (const para of sanitize(text).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, s) > width && line) { out.push(line); line = w; } else line = t; }
      out.push(line);
    }
    return out;
  };
  const need = (h) => { if (y - h < 72) newPage(); };
  newPage();
  if (preparedBy) { for (const l of preparedBy) { page.drawText(sanitize(l), { x: L, y, size: 9, font: reg }); y -= 11; } y -= 14; }
  for (const t of title) { const lines = wrap(t, bold, R - L, 13); for (const l of lines) { need(16); page.drawText(l, { x: (W - bold.widthOfTextAtSize(l, 13)) / 2, y, size: 13, font: bold }); y -= 16; } }
  y -= 12;
  for (const b of blocks) {
    if (b.type === 'para' || b.type === 'item') {
      const ind = b.type === 'item' ? 28 : 0;
      const font = b.bold ? bold : (b.italic ? ital : reg);
      const lines = wrap(b.text, font, R - L - ind);
      need(lead * Math.min(lines.length, 3));
      if (b.type === 'item') page.drawText(`${b.n}.`, { x: L, y, size, font: reg });
      for (const l of lines) { need(lead); page.drawText(l, { x: L + ind, y, size, font }); y -= lead; }
      y -= 6;
    } else if (b.type === 'single') {
      for (const l of b.lines) { need(14); page.drawText(sanitize(l), { x: L + (b.indent || 0), y, size, font: reg }); y -= 14; }
      y -= 8;
    } else if (b.type === 'signature') {
      need(96);
      y -= 30;
      page.drawLine({ start: { x: L, y }, end: { x: L + 230, y }, thickness: 0.5 });
      page.drawLine({ start: { x: L + 260, y }, end: { x: R, y }, thickness: 0.5 });
      y -= 12;
      page.drawText(sanitize(b.name), { x: L, y, size: 11, font: reg });
      page.drawText('Signature', { x: L + 260, y, size: 9, font: ital });
      y -= 22;
      page.drawText('Date: ______________________   Executed at ____________________________, California', { x: L, y, size: 10, font: reg });
      y -= 14;
    } else if (b.type === 'box') {
      const lines = wrap(b.text, b.bold ? bold : reg, R - L - 16, 11);
      const h = lines.length * 14 + (b.space || 0) + 14;
      need(h + 10);
      page.drawRectangle({ x: L, y: y - h + 10, width: R - L, height: h, borderWidth: 0.75, borderColor: rgb(0, 0, 0) });
      let yy = y - 4;
      for (const l of lines) { page.drawText(l, { x: L + 8, y: yy, size: 11, font: b.bold ? bold : reg }); yy -= 14; }
      y -= h + 10;
    } else if (b.type === 'space') y -= b.h || 12;
  }
  return doc;
}

module.exports = { buildPlainDoc };
