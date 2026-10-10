// Formatting without time-zone drift. A date string 'YYYY-MM-DD' is never passed through
// new Date(), which is what printed every date one day early in Pacific time (report D8, D9).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isoDate(v) {
  if (v === undefined || v === null || v === '') return '';
  if (v instanceof Date) {
    // calendar date in Pacific time
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(v);
    return parts; // YYYY-MM-DD
  }
  if (typeof v === 'object' && typeof v.toDate === 'function') return isoDate(v.toDate());
  if (typeof v === 'object' && typeof v.seconds === 'number') return isoDate(new Date(v.seconds * 1000));
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}
function fmtDate(v) {
  const d = isoDate(v);
  if (!d) return v ? String(v) : '';
  const [y, mo, da] = d.split('-');
  return `${mo}/${da}/${y}`;
}
function longDate(v) {
  const d = isoDate(v);
  if (!d) return v ? String(v) : '';
  const [y, mo, da] = d.split('-');
  return `${MONTHS[Number(mo) - 1]} ${Number(da)}, ${y}`;
}
function num(v) {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function money(v) {
  if (v === undefined || v === null || v === '') return '';
  const n = num(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function addDays(iso, days) {
  const d = isoDate(iso); if (!d) return '';
  const [y, m, da] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, da + days));
  return t.toISOString().slice(0, 10);
}
function addMonths(iso, months) {
  const d = isoDate(iso); if (!d) return '';
  const [y, m, da] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, da));
  return t.toISOString().slice(0, 10);
}
module.exports = { isoDate, fmtDate, longDate, num, money, addDays, addMonths, MONTHS };
