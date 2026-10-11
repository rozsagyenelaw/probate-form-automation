// Date line for the generated letters (VERIFY-60 item C): a letter is dated from the case file,
// never silently with the generation date when that date is already past the legal deadline.
//  1. the date the letter was (or will be) mailed, answered for this letter (`<FORM>.date`) or for
//     all letters (`letter.date`), or a mailing date already recorded elsewhere in the file;
//  2. otherwise today's date, if no deadline has passed;
//  3. otherwise the date is left blank and asked for, with a warning naming the deadline.
// A date after the deadline is printed as answered, with a warning.
const { isoDate, longDate } = require('./format');

function letterDate(F, d, ctx, { form, mailedKeys = [], deadline, deadlineText = 'the deadline', notAfter, notAfterText }) {
  const today = isoDate(ctx.now || new Date());
  for (const key of [`${form}.date`, 'letter.date', ...mailedKeys]) {
    const v = F.opt(key); const iso = v ? isoDate(v) : '';
    if (!iso) continue;
    if (deadline && iso > deadline) ctx.warnings.push(`Letter date ${longDate(iso)} is after ${deadlineText} (${longDate(deadline)}).`);
    d.calc('letter.date', 'Letter date', longDate(iso), F.src(key), 'Date');
    return longDate(iso);
  }
  const late = (deadline && today > deadline) || (notAfter && today > notAfter);
  if (late) {
    const why = deadline && today > deadline ? `${deadlineText} (${longDate(deadline)}) has passed` : `${notAfterText} (${longDate(notAfter)}) has passed`;
    ctx.warnings.push(`Letter date left blank: ${why}. Enter the date it was or will be mailed.`);
    F.need(`${form}.date`, form, { label: `Date this letter was or will be mailed (${why})`, type: 'date' });
    d.calc('letter.date', 'Letter date', '', `NEEDS ANSWER: ${form}.date`, 'Date');
    return '';
  }
  d.calc('letter.date', 'Letter date', longDate(today), 'date the letter was generated (change if mailed later)', 'Date');
  return longDate(today);
}

module.exports = { letterDate };
