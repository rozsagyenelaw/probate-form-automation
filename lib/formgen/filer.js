// The filer shown on every court form and pleading: the petitioner, a self-represented party
// (Rozsa's decision of 2026-10-10: her office prepares the papers but is not attorney of record).
// Name, address, phone and email come from the case file; anything missing is asked.
// No attorney name, State Bar number, firm name or firm email appears on any court paper; the
// only exception is the notice of limited scope representation (MC-950) for a hearing appearance.
const { oneLineAddress } = require('./facts');

const SELF = 'Self-represented';

function filer(F, form) {
  const n = F.v('petitioner.name', form);
  const a = F.v('petitioner.address', form);
  const ph = F.v('petitioner.phone', form);
  const em = F.opt('petitioner.email');
  const addr = a && typeof a.value === 'object' ? a.value : null;
  const line = a ? oneLineAddress(a.value) : '';
  // address given as one line (an attorney answer): split "street, city, ST zip"
  let street = addr ? addr.street : ''; let city = addr ? addr.city : ''; let state = addr ? addr.state : ''; let zip = addr ? addr.zip : '';
  if (a && !addr) { const m = /^(.*?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(line); if (m) { [, street, city, state, zip] = m; } else street = line; }
  const v = (value, source) => (value ? { value, source } : undefined);
  return {
    name: n, nameCaps: n ? { value: n.value.toUpperCase(), source: n.source } : undefined,
    street: a ? v(street, a.source) : undefined, city: a ? v(city, a.source) : undefined, state: a ? v(state, a.source) : undefined, zip: a ? v(zip, a.source) : undefined,
    cityStateZip: a ? v([city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), a.source) : undefined,
    oneLine: a ? v(line, a.source) : undefined,
    phone: ph, email: em ? { value: em, source: F.src('petitioner.email') } : undefined,
    attorneyFor: { value: SELF, source: 'Petitioner is self-represented (Rozsa decision 2026-10-10)' },
    selfLabel: SELF,
  };
}

// lines for a pleading caption or a plain document: name, street, city/state/zip, phone, email
function partyLines(F, form) {
  const fl = filer(F, form);
  return [
    fl.nameCaps ? fl.nameCaps.value : '[ANSWER NEEDED: petitioner name]',
    fl.street ? fl.street.value : '[ANSWER NEEDED: petitioner address]',
    fl.cityStateZip ? fl.cityStateZip.value : '',
    fl.phone ? `Telephone: ${fl.phone.value}` : '[ANSWER NEEDED: petitioner phone]',
    fl.email ? `Email: ${fl.email.value}` : '',
  ].filter(Boolean);
}

module.exports = { filer, partyLines, SELF };
