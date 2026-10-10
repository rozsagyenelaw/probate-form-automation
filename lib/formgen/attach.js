const { embed: embedFont } = require('./fonts');
// Continuation attachment pages (e.g. "Attachment 8" when more heirs than the form has rows).
const { StandardFonts, rgb } = require('pdf-lib');

function wrap(font, text, size, width) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// columns: [{ title, width }], rows: [[cell, cell, ...]]
async function appendTableAttachment(doc, { estate, caseNumber, formId, title, columns, rows, intro }) {
  const font = await embedFont(doc, 'Helvetica');
  const bold = await embedFont(doc, 'HelveticaBold');
  const W = 612; const H = 792; const M = 36; const size = 9;
  let page; let y;
  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: M, y: H - M - 34, width: W - 2 * M, height: 34, borderWidth: 0.75, borderColor: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 400, y: H - M }, end: { x: 400, y: H - M - 34 }, thickness: 0.75 });
    page.drawText('ESTATE OF (name):', { x: M + 4, y: H - M - 10, size: 7, font });
    page.drawText(estate || '', { x: M + 4, y: H - M - 26, size: 10, font: bold });
    page.drawText('CASE NUMBER:', { x: 404, y: H - M - 10, size: 7, font });
    page.drawText(caseNumber || '', { x: 404, y: H - M - 26, size: 10, font });
    page.drawText(title, { x: M, y: H - M - 56, size: 11, font: bold });
    page.drawText(`(Attachment to ${formId})`, { x: M, y: H - M - 69, size: 8, font });
    y = H - M - 90;
    if (intro) { for (const l of wrap(font, intro, size, W - 2 * M)) { page.drawText(l, { x: M, y, size, font }); y -= 12; } y -= 4; }
    let x = M;
    for (const c of columns) { page.drawText(c.title, { x, y, size, font: bold }); x += c.width; }
    y -= 14;
  };
  newPage();
  for (const r of rows) {
    const cells = columns.map((c, i) => wrap(font, r[i] || '', size, c.width - 8));
    const h = Math.max(...cells.map((c) => c.length)) * 11 + 6;
    if (y - h < M + 20) newPage();
    let x = M;
    cells.forEach((lines, i) => { lines.forEach((l, k) => page.drawText(l, { x, y: y - k * 11, size, font })); x += columns[i].width; });
    y -= h;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.25, color: rgb(0.6, 0.6, 0.6) });
  }
}

module.exports = { appendTableAttachment, wrap };
