// Lodging the original will, Prob. Code 8200. Unless a petition for probate is filed first, the
// custodian of the will must, within 30 days after learning of the death, (1) deliver the will
// personally or by registered or certified mail to the clerk of the superior court of the county
// where the estate may be administered, and (2) deliver a copy under 1215 to the executor named
// in the will (or, if the executor's whereabouts are unknown, to a named beneficiary).
// Fee: $50 (Gov. Code 70626(d), opened 2026-10-10). LASC accepts deposits at the Stanley Mosk
// Courthouse probate filing window (lacourt.ca.gov "Filing my probate documents", opened
// 2026-10-10); no LASC form exists for 8200 lodging.
// Two records: the cover letter to the clerk, and the transmittal of a copy to the executor.
const { buildLetter } = require('../letter');
const { docFields } = require('../docfields');
const { longDate, isoDate, addDays, fmtDate } = require('../format');
const { oneLineAddress, S } = require('../facts');

const ID = 'WILL-LODGING';
const LA_CLERK = ['Clerk of the Superior Court of California, County of Los Angeles', 'Probate Filing, Room 429 (4th Floor)', 'Stanley Mosk Courthouse', '111 N. Hill St.', 'Los Angeles, CA 90012'];

function records() {
  return [{ label: 'Cover letter lodging the original will with the court clerk', kind: 'clerk' }, { label: 'Transmittal of a copy of the will to the named executor', kind: 'executor' }];
}

async function build(F, ctx) {
  const d = docFields(F, ID);
  const name = d.t('decedent.name', { label: 'Decedent name', item: 'RE' });
  const dod = d.t('decedent.dateOfDeath', { label: 'Date of death', date: true, item: 'RE' });
  const wd = d.t('will.date', { label: 'Date of the will', date: true, item: 'RE' });
  const cod = F.opt('will.codicilDates');
  const codText = cod && !/^none$/i.test(String(cod).trim()) ? ` and codicil(s) dated ${cod}` : '';
  const cust = d.t('will.custodianName', { label: 'Name of the person who has custody of the original will (Prob. Code 8200)', item: 'Body' });
  const known = d.raw('will.knowledgeOfDeathDate', { label: 'Date the custodian learned of the death (lodge within 30 days, Prob. Code 8200(a))', type: 'date', item: 'Deadline', show: fmtDate });
  if (known) ctx.warnings.push(`Lodge the will no later than ${fmtDate(addDays(known, 30))} (30 days after the custodian learned of the death, Prob. Code 8200(a)).`);
  if (F.opt('case.number')) ctx.warnings.push('A petition appears to be on file (case number in the file): Prob. Code 8200 applies only "unless a petition for probate of the will is earlier filed".');
  const today = isoDate(ctx.now || new Date());
  const date = F.opt('letter.date') ? longDate(F.opt('letter.date')) : longDate(today);
  d.calc('letter.date', 'Letter date', date, F.opt('letter.date') ? F.src('letter.date') : 'date the letter was generated (change if mailed later)', 'Date');
  let doc;
  if (ctx.record.kind === 'clerk') {
    const county = F.opt('court.county');
    let recipient;
    if (county && /^los angeles$/i.test(county)) { recipient = LA_CLERK; d.calc('will.clerkAddress', 'Clerk address', LA_CLERK.join(', '), 'https://www.lacourt.ca.gov/pages/lp/probate/cp/filing-my-probate-documents (opened 2026-10-10)', 'Recipient'); }
    else recipient = [d.t('will.clerkAddress', { label: 'Address of the superior court clerk for will deposits in the county where the estate may be administered', item: 'Recipient' })];
    const method = d.t('will.lodgingMethod', { label: 'How the will is delivered to the clerk (Prob. Code 8200(a)(1)): personal delivery, certified mail, or registered mail', type: 'choice', options: ['personal delivery', 'certified mail', 'registered mail'], item: 'Delivery' });
    doc = await buildLetter({
      date,
      recipient: [`VIA ${String(method).toUpperCase()}`, '', ...recipient],
      re: [`Estate of ${name}, Deceased`, `Date of death: ${dod}`, 'Deposit of Original Will (Probate Code section 8200)'],
      body: [
        `On behalf of ${cust}, the custodian of the decedent's original will, we enclose for deposit under Probate Code section 8200 the original will of ${name} dated ${wd}${codText}.`,
        'Also enclosed is a check for $50.00 for the deposit fee under Government Code section 70626(d), and a copy of the decedent\'s death certificate.',
        'Please file the original will, and return a conformed copy of this letter in the enclosed self-addressed, stamped envelope.',
      ],
      enclosures: [`Original will dated ${wd}${codText}`, 'Check for $50.00 (Gov. Code 70626(d))', 'Copy of death certificate', 'Self-addressed, stamped envelope'],
    });
  } else {
    const exName = d.t('will.executorName', { label: 'Executor named in the will', item: 'Recipient' });
    let addr;
    const pn = S(F.opt('petitioner.name')).toLowerCase();
    if (pn && pn === S(F.opt('will.executorName')).toLowerCase() && F.opt('petitioner.address')) { addr = oneLineAddress(F.opt('petitioner.address')); d.calc('will.executorAddress', 'Executor address', addr, `${F.src('petitioner.address')} (the named executor is the petitioner)`, 'Recipient'); }
    else addr = d.t('will.executorAddress', { label: 'Mailing address of the executor named in the will', item: 'Recipient' });
    doc = await buildLetter({
      date,
      recipient: [exName, ...String(addr).split(/,\s*(?=[^,]+,\s*[A-Z]{2}\s+\d{5})/)],
      re: [`Estate of ${name}, Deceased`, `Date of death: ${dod}`, 'Copy of Will (Probate Code section 8200(a)(2))'],
      body: [
        `As required by Probate Code section 8200(a)(2), we enclose a copy of the will of ${name} dated ${wd}${codText}, which names you as executor. The original will is being deposited with the clerk of the superior court.`,
        'Please call this office at 818-337-4071 with any questions.',
      ],
      enclosures: [`Copy of will dated ${wd}${codText}`],
    });
  }
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Deposit of Original Will with the Court Clerk (Prob. Code 8200)', revision: 'Office letters', sourceUrl: 'https://www.lacourt.ca.gov/pages/lp/probate/cp/filing-my-probate-documents', procedures: ['full'], records, build };
