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

function records(F) {
  const out = [{ label: 'Cover letter lodging the original will with the court clerk', kind: 'clerk' }];
  // the copy to the named executor is not needed when the custodian is that executor
  const cust = String((F && F.opt('will.custodianName')) || '').trim().toLowerCase();
  const ex = String((F && F.opt('will.executorName')) || '').trim().toLowerCase();
  if (!(cust && ex && cust === ex)) out.push({ label: 'Transmittal of a copy of the will to the named executor', kind: 'executor' });
  return out;
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
  // dated from the file: never silently after the 8200 deadline (deposit) or after the hearing
  // on the pending petition (VERIFY-60 item 02)
  const pending = !!F.opt('case.number');
  const hIso = F.opt('hearing.date') ? isoDate(F.opt('hearing.date')) : '';
  const date = require('../letterdate').letterDate(F, d, ctx, pending
    ? { form: ID, notAfter: hIso || undefined, notAfterText: 'the hearing on the pending petition' }
    : { form: ID, deadline: known ? isoDate(addDays(known, 30)) : undefined, deadlineText: 'the 30-day deadline to lodge the will (Prob. Code 8200(a))' });
  // the custodian of the original will writes in their own name (no law-firm letterhead)
  const custAddr = d.t('will.custodianAddress', { label: 'Mailing address of the custodian of the original will (street, city, state, ZIP)', item: 'Sender' });
  const sender = { lines: [cust, ...String(custAddr).split(/,\s*(?=[^,]+,\s*[A-Z]{2}\s+\d{5})/)], signName: cust, signTitle: 'Custodian of the original will' };
  let doc;
  if (ctx.record.kind === 'clerk') {
    const county = F.opt('court.county');
    let recipient;
    if (county && /^los angeles$/i.test(county)) { recipient = LA_CLERK; d.calc('will.clerkAddress', 'Clerk address', LA_CLERK.join(', '), 'https://www.lacourt.ca.gov/pages/lp/probate/cp/filing-my-probate-documents (opened 2026-10-10)', 'Recipient'); }
    else recipient = [d.t('will.clerkAddress', { label: 'Address of the superior court clerk for will deposits in the county where the estate may be administered', item: 'Recipient' })];
    const method = d.t('will.lodgingMethod', { label: 'How the will is delivered to the clerk (Prob. Code 8200(a)(1)): personal delivery, certified mail, or registered mail', type: 'choice', options: ['personal delivery', 'certified mail', 'registered mail'], item: 'Delivery' });
    doc = await buildLetter({
      sender,
      date,
      recipient: [`VIA ${String(method).toUpperCase()}`, '', ...recipient],
      ...(F.opt('case.number') ? {
        re: [`Estate of ${name}, Deceased`, `Case No. ${F.opt('case.number')}`, `Date of death: ${dod}`, 'Original will for the pending petition'],
        body: [
          `I am the custodian of the original will of ${name}. A petition for probate is pending in this Court as Case No. ${F.opt('case.number')}${F.opt('hearing.date') ? `, set for hearing on ${longDate(F.opt('hearing.date'))}` : ''}. I enclose the original will dated ${wd}${codText} for filing in that case. The original will must be filed on paper (LASC Local Rule 4.7(c)(2)).`,
          'Also enclosed is a copy of the decedent\'s death certificate.',
          'Please file the original will in the case, and return a conformed copy of this letter in the enclosed self-addressed, stamped envelope.',
        ],
        enclosures: [`Original will dated ${wd}${codText}`, 'Copy of death certificate', 'Self-addressed, stamped envelope'],
      } : {
        re: [`Estate of ${name}, Deceased`, `Date of death: ${dod}`, 'Deposit of Original Will (Probate Code section 8200)'],
        body: [
        `I am the custodian of the original will of ${name}. I enclose for deposit under Probate Code section 8200 the original will dated ${wd}${codText}.`,
        'Also enclosed is a check for $50.00 for the deposit fee under Government Code section 70626(d), and a copy of the decedent\'s death certificate.',
        'Please file the original will, and return a conformed copy of this letter in the enclosed self-addressed, stamped envelope.',
      ],
        enclosures: [`Original will dated ${wd}${codText}`, 'Check for $50.00 (Gov. Code 70626(d))', 'Copy of death certificate', 'Self-addressed, stamped envelope']
      }),
    });
  } else {
    const exName = d.t('will.executorName', { label: 'Executor named in the will', item: 'Recipient' });
    let addr;
    const pn = S(F.opt('petitioner.name')).toLowerCase();
    if (pn && pn === S(F.opt('will.executorName')).toLowerCase() && F.opt('petitioner.address')) { addr = oneLineAddress(F.opt('petitioner.address')); d.calc('will.executorAddress', 'Executor address', addr, `${F.src('petitioner.address')} (the named executor is the petitioner)`, 'Recipient'); }
    else addr = d.t('will.executorAddress', { label: 'Mailing address of the executor named in the will', item: 'Recipient' });
    doc = await buildLetter({
      sender,
      date,
      recipient: [exName, ...String(addr).split(/,\s*(?=[^,]+,\s*[A-Z]{2}\s+\d{5})/)],
      re: [`Estate of ${name}, Deceased`, `Date of death: ${dod}`, 'Copy of Will (Probate Code section 8200(a)(2))'],
      body: [
        `As required by Probate Code section 8200(a)(2), I enclose a copy of the will of ${name} dated ${wd}${codText}, which names you as executor. The original will is being deposited with the clerk of the superior court.`,
      ],
      enclosures: [`Copy of will dated ${wd}${codText}`],
    });
  }
  return { doc, fields: d.fields };
}

module.exports = { id: ID, kind: 'doc', title: 'Deposit of Original Will with the Court Clerk (Prob. Code 8200)', revision: 'Generated letter', sourceUrl: 'https://www.lacourt.ca.gov/pages/lp/probate/cp/filing-my-probate-documents', procedures: ['full'], records, build };
