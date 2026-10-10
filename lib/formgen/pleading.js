const { embed: embedFont } = require('./fonts');
// 28-line pleading paper, drawn to match the office template ~/Pleading_Paper_Template_v2.docx
// (US Letter, 1 inch margins, line numbers 1 to 28 at the left, a double rule left of the text,
// a single rule at the right, Times New Roman 12, footer with the case caption and page number).
// Geometry measured from the template rendered by LibreOffice: first line top 73.1 pt, line
// pitch 23.1 pt, rules at x = 64.8 / 68.8 and 539.2, text from x = 72 to x = 533.
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const firm = require('./firm');

const G = { W: 612, H: 792, top: 73.1, pitch: 23.1, lines: 28, left: 72, right: 533, ruleL1: 64.8, ruleL2: 68.8, ruleR: 539.2, size: 12 };

function sanitize(t) { return String(t == null ? '' : t).replace(/[–—]/g, '-'); }

class Pleading {
  constructor(doc, fonts, opts) {
    this.doc = doc; this.f = fonts; this.o = opts; this.page = null; this.slot = 0; this.pageNo = 0;
  }
  // slots are half lines: slot 0 = line 1; slot 2 = line 2 ... slot 54 = line 28
  newPage() {
    const p = this.doc.addPage([G.W, G.H]);
    this.page = p; this.pageNo += 1; this.slot = 0;
    const black = rgb(0, 0, 0);
    p.drawLine({ start: { x: G.ruleL1, y: 0 }, end: { x: G.ruleL1, y: G.H }, thickness: 0.75, color: black });
    p.drawLine({ start: { x: G.ruleL2, y: 0 }, end: { x: G.ruleL2, y: G.H }, thickness: 0.75, color: black });
    p.drawLine({ start: { x: G.ruleR, y: 0 }, end: { x: G.ruleR, y: G.H }, thickness: 0.75, color: black });
    for (let i = 1; i <= G.lines; i++) {
      const s = String(i); const w = this.f.reg.widthOfTextAtSize(s, G.size);
      p.drawText(s, { x: 58.9 - w, y: this.baseline((i - 1) * 2), size: G.size, font: this.f.reg });
    }
    // footer: rule, caption title and page number
    const ft = sanitize(`${this.o.footer} - ${this.pageNo}`);
    p.drawLine({ start: { x: G.left, y: 52 }, end: { x: G.right, y: 52 }, thickness: 0.5, color: black });
    let fs = 9;
    while (fs > 6.5 && this.f.reg.widthOfTextAtSize(ft, fs) > G.right - G.left) fs -= 0.5;
    const lines = this.f.reg.widthOfTextAtSize(ft, fs) > G.right - G.left ? this.wrap(ft, this.f.reg, G.right - G.left, fs) : [ft];
    lines.forEach((l, i) => { const fw = this.f.reg.widthOfTextAtSize(l, fs); p.drawText(l, { x: (G.left + G.right) / 2 - fw / 2, y: 42 - i * (fs + 1), size: fs, font: this.f.reg }); });
  }
  baseline(slot) { return G.H - (G.top + (slot / 2) * G.pitch) - 9.5; }
  ensure(slots) { if (!this.page || this.slot + slots > (G.lines - 1) * 2 + 1) this.newPage(); }
  wrap(text, font, width, size = G.size) {
    const out = [];
    for (const para of sanitize(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const t = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = word; } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  // draw lines of text; step = 2 (double spaced) or 1 (single spaced)
  lines(lines, { x = G.left, step = 2, font = this.f.reg, align = 'left', width = G.right - x, size = G.size } = {}) {
    for (const l of lines) {
      this.ensure(step === 2 ? 1 : 1);
      let dx = x;
      if (align === 'center') dx = x + (width - font.widthOfTextAtSize(l, size)) / 2;
      if (align === 'right') dx = x + width - font.widthOfTextAtSize(l, size);
      this.page.drawText(l, { x: dx, y: this.baseline(this.slot), size, font });
      this.slot += step;
    }
  }
  para(text, { indent = 36, step = 2, bold = false, x = G.left, width } = {}) {
    const font = bold ? this.f.bold : this.f.reg;
    const w = (width || G.right - x);
    const words = this.wrap(text, font, w - indent);
    // first line indented, following lines full width: re-wrap properly
    const all = []; let rest = sanitize(text);
    if (indent) {
      const first = this.wrap(rest, font, w - indent)[0] || '';
      all.push({ t: first, x: x + indent });
      rest = rest.slice(first.length).trim();
      for (const l of rest ? this.wrap(rest, font, w) : []) all.push({ t: l, x });
    } else for (const l of words) all.push({ t: l, x });
    for (const l of all) { this.ensure(1); this.page.drawText(l.t, { x: l.x, y: this.baseline(this.slot), size: G.size, font }); this.slot += step; }
  }
  blank(slots = 1) { this.slot += slots; }
  heading(text) { const ls = this.wrap(text, this.f.bold, G.right - G.left); this.lines(ls, { font: this.f.bold, align: 'center', x: G.left, width: G.right - G.left }); }
  // two-column table, single spaced; rows: [[left, right], ...]
  table(rows, { widths = [330, 131], step = 1, headerRow } = {}) {
    const draw = (r, font) => {
      const a = this.wrap(r[0], font, widths[0] - 8); const b = this.wrap(r[1] || '', font, widths[1] - 4);
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) {
        this.ensure(1);
        if (a[i]) this.page.drawText(a[i], { x: G.left + 18, y: this.baseline(this.slot), size: G.size, font });
        if (b[i]) this.page.drawText(b[i], { x: G.left + 18 + widths[0] + widths[1] - 22 - font.widthOfTextAtSize(b[i], G.size), y: this.baseline(this.slot), size: G.size, font });
        this.slot += step;
      }
    };
    if (headerRow) draw(headerRow, this.f.bold);
    for (const r of rows) draw(r, r.bold ? this.f.bold : this.f.reg);
  }
  signature({ dateLine = 'Dated:', lines }) {
    this.ensure(8);
    this.lines([dateLine], { step: 2 });
    this.blank(1);
    const x = 306;
    this.page.drawLine({ start: { x, y: this.baseline(this.slot) + 14 }, end: { x: G.right, y: this.baseline(this.slot) + 14 }, thickness: 0.5 });
    this.lines(lines, { x, step: 1 });
    this.blank(1);
  }
}

// opts: { title, footer, attorneyFor, county, caseNumber, hearing: {date,time,dept}, captionLeft, build(p) }
async function buildPleading(opts) {
  const doc = await PDFDocument.create();
  const fonts = { reg: await embedFont(doc, 'TimesRoman'), bold: await embedFont(doc, 'TimesRomanBold') };
  const p = new Pleading(doc, fonts, opts);
  p.newPage();
  // attorney block, single spaced from line 1
  p.lines([
    `${firm.attorneyNameCaps} (SBN ${firm.barNumber})`, firm.firmNameCaps, firm.street, firm.cityStateZip(), `Telephone: ${firm.phone}`, `Email: ${firm.email}`, '', `Attorney for ${opts.attorneyFor || ''}`,
  ], { step: 1 });
  p.slot = Math.max(p.slot, 14); // court title on line 8
  p.lines(['SUPERIOR COURT OF THE STATE OF CALIFORNIA', `FOR THE COUNTY OF ${(opts.county || '').toUpperCase()}`], { align: 'center', font: fonts.bold, step: 2, width: G.right - G.left });
  p.blank(1);
  // caption box
  const capTop = p.slot;
  const left = opts.captionLeft || [];
  const right = [
    `Case No.: ${opts.caseNumber || ''}`, '',
    ...p.wrap(opts.title.toUpperCase(), fonts.bold, G.right - 316),
    '',
    ...(opts.hearing ? [`Date: ${opts.hearing.date || ''}`, `Time: ${opts.hearing.time || ''}`, `Dept.: ${opts.hearing.dept || ''}`] : []),
  ];
  const rows = Math.max(left.length * 2, right.length) + 1;
  for (let i = 0; i < left.length; i++) p.page.drawText(sanitize(left[i]), { x: G.left, y: p.baseline(capTop + i * 2), size: G.size, font: fonts.reg });
  right.forEach((l, i) => { if (l) p.page.drawText(sanitize(l), { x: 316, y: p.baseline(capTop + i), size: G.size, font: /^Case No|^Date|^Time|^Dept/.test(l) ? fonts.reg : fonts.bold }); });
  const yBottom = p.baseline(capTop + rows) + 12;
  p.page.drawLine({ start: { x: 306, y: p.baseline(capTop) + 14 }, end: { x: 306, y: yBottom }, thickness: 0.5 });
  p.page.drawLine({ start: { x: G.left, y: yBottom }, end: { x: 306, y: yBottom }, thickness: 0.5 });
  p.slot = capTop + rows + 1;
  if (p.slot % 2) p.slot += 1; // back on a numbered line
  await opts.build(p, fonts);
  return doc;
}

module.exports = { buildPleading, G, sanitize };
