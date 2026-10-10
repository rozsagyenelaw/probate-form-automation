// The caption every Judicial Council probate form shares: attorney block, court block,
// estate name and case number. Field names differ between forms, so header fields are
// recognised by their tooltip and their parent subform. The attorney block is exactly the
// DE-111 block Rozsa approved; the fax line is always blank (house rule: no fax anywhere).
const { PDFTextField } = require('pdf-lib');
const { filer } = require('./filer');
const { courtFor } = require('./courts');
const { tooltip } = require('./pdf');

const SRC = 'Petitioner (self-represented), case file';

function classify(name, tip) {
  const t = tip.replace(/\s+/g, ' ').trim().toUpperCase();
  const inAtty = /Atty|Attorney|AttyPartyInfo|AttyInfo/i.test(name) || /^Add\d_ft/.test(name.split('.').pop()) || /\.Add1\[0\]$/.test(name);
  const inCourt = /CourtInfo|CrtInfo/i.test(name);
  const last = name.split('.').pop();
  if (/^Add[1-5]_ft\[0\]$/.test(last)) return `attyLine${last[3]}`;
  if (/ATTORNEY OR PARTY WITHOUT ATTORNEY \(NAME/.test(t)) return 'attyBlock';
  if (/ATTORNEY FOR/.test(t)) return 'attyFor';
  if (inCourt) {
    if (/COUNTY OF/.test(t)) return 'courtCounty';
    if (/STREET ADDRESS/.test(t)) return 'courtStreet';
    if (/MAILING/.test(t)) return 'courtMailing';
    if (/CITY AND ZIP/.test(t)) return 'courtCityZip';
    if (/BRANCH/.test(t)) return 'courtBranch';
    return null;
  }
  if (inAtty || /StdP1Header/.test(name)) {
    if (/STATE BAR/.test(t)) return 'attyBar';
    if (/FIRM/.test(t)) return 'attyFirm';
    if (/^NAME:?$/.test(t)) return 'attyName';
    if (/STREET ADDRESS/.test(t)) return 'attyStreet';
    if (/CITY, STATE, ZIP/.test(t)) return 'attyCityStateZip';
    if (/^CITY:?$/.test(t)) return 'attyCity';
    if (/^STATE:?$/.test(t)) return 'attyState';
    if (/^ZIP CODE:?$/.test(t)) return 'attyZip';
    if (/TEL|PHONE/.test(t)) return 'attyPhone';
    if (/FAX/.test(t)) return 'attyFax';
    if (/E-?MAIL/.test(t)) return 'attyEmail';
  }
  return null;
}

function hasRole(f, role) {
  return f.form.getFields().some((fld) => fld instanceof PDFTextField && classify(fld.getName(), tooltip(fld)) === role);
}

// opts.attorneyFor: string | {value, source} | undefined
function header(f, F, opts = {}) {
  const fields = f.form.getFields().filter((x) => x instanceof PDFTextField);
  const roles = fields.map((x) => [x.getName(), classify(x.getName(), tooltip(x))]).filter(([, r]) => r);
  const present = new Set(roles.map(([, r]) => r));
  const court = present.has('courtCounty') ? courtFor(F, f.formId) : null;
  const fl = filer(F, f.formId);
  const val = (x) => (x ? x.value : '');
  const blockLines = [val(fl.name), val(fl.street), val(fl.cityStateZip)];
  if (!present.has('attyEmail') && fl.email) blockLines.push(fl.email.value);
  const lineVals = { attyLine1: fl.name, attyLine2: fl.street, attyLine3: fl.cityStateZip, attyLine4: undefined, attyLine5: undefined };
  for (const [name, role] of roles) {
    const m = { item: 'Caption', label: undefined, source: SRC };
    switch (role) {
      case 'attyBlock': {
        const fld = f.field(name);
        fld.enableMultiline();
        const h = fld.acroField.getWidgets()[0].getRectangle().height;
        fld.setFontSize(Math.max(6, Math.min(9, Math.floor((h - 2) / (blockLines.length * 1.18)))));
        f.text(name, fl.name && fl.street ? { value: blockLines.filter(Boolean).join('\n'), source: `${fl.name.source}; ${fl.street.source}` } : undefined, { ...m, label: 'Party without attorney (name and address)', source: undefined, need: !fl.name ? 'petitioner.name' : 'petitioner.address' });
        break;
      }
      case 'attyLine1': case 'attyLine2': case 'attyLine3': case 'attyLine4': case 'attyLine5':
        f.text(name, lineVals[role], { ...m, label: `Party block line ${role.slice(-1)}`, source: undefined, blankReason: 'Not used' }); break;
      case 'attyName': f.text(name, fl.name, { ...m, source: undefined, label: 'Name (party without attorney)', need: 'petitioner.name' }); break;
      case 'attyBar': f.text(name, undefined, { ...m, label: 'State Bar number', blankReason: 'Self-represented party: no State Bar number' }); break;
      case 'attyFirm': f.text(name, undefined, { ...m, label: 'Firm name', blankReason: 'Self-represented party: no firm' }); break;
      case 'attyStreet': f.text(name, fl.street, { ...m, source: undefined, label: 'Street address', need: 'petitioner.address' }); break;
      case 'attyCity': f.text(name, fl.city, { ...m, source: undefined, label: 'City', need: 'petitioner.address' }); break;
      case 'attyState': f.text(name, fl.state, { ...m, source: undefined, label: 'State', need: 'petitioner.address' }); break;
      case 'attyZip': f.text(name, fl.zip, { ...m, source: undefined, label: 'ZIP code', need: 'petitioner.address' }); break;
      case 'attyCityStateZip': f.text(name, fl.cityStateZip, { ...m, source: undefined, label: 'City, state, ZIP', need: 'petitioner.address' }); break;
      case 'attyPhone': f.text(name, fl.phone, { ...m, source: undefined, label: 'Telephone', need: 'petitioner.phone' }); break;
      case 'attyFax': f.text(name, '', { ...m, label: 'Fax', blankReason: 'No fax (house rule)' }); break;
      case 'attyEmail': f.text(name, fl.email, { ...m, source: undefined, label: 'Email', blankReason: 'No email in the file' }); break;
      case 'attyFor': f.text(name, fl.attorneyFor, { ...m, label: 'Attorney for', source: undefined }); break;
      case 'courtCounty': f.text(name, court.county ? { value: court.county, source: court.countySource } : undefined, { ...m, label: 'Court county', source: undefined, need: 'court.county' }); break;
      case 'courtStreet': f.text(name, court.street ? { value: court.street, source: court.source } : undefined, { ...m, label: 'Court street address', source: undefined, need: court.need }); break;
      case 'courtMailing': f.text(name, court.mailing ? { value: court.mailing, source: court.source } : undefined, { ...m, label: 'Court mailing address', source: undefined, need: court.need }); break;
      case 'courtCityZip': f.text(name, court.cityZip ? { value: court.cityZip, source: court.source } : undefined, { ...m, label: 'Court city and ZIP', source: undefined, need: court.need }); break;
      case 'courtBranch': f.text(name, court.branch ? { value: court.branch, source: court.source } : undefined, { ...m, label: 'Court branch name', source: undefined, need: court.need }); break;
      default: break;
    }
  }
  return court;
}

// Estate name on every page caption and the case number (blank until the court assigns one).
// Recognised by tooltip: "ESTATE OF (name)" / "name:" in a caption subform / "CASE NUMBER".
function caption(f, F, { estateFields, caseFields } = {}) {
  const fields = f.form.getFields().filter((x) => x instanceof PDFTextField);
  const est = estateFields || fields.filter((x) => /^ESTATE OF \(NAME\):?$|^NAME:?$/i.test(tooltip(x).trim()) && !/Atty|Attorney/i.test(x.getName())).map((x) => x.getName());
  const cas = caseFields || fields.filter((x) => /^CASE NUMBER:?$/i.test(tooltip(x).trim())).map((x) => x.getName());
  const dn = F.v('decedent.name', f.formId);
  for (const n of est) f.text(n, dn ? { value: dn.value, source: dn.source } : undefined, { item: 'Caption', label: 'Estate of (name)', need: 'decedent.name' });
  const cn = F.opt('case.number');
  for (const n of cas) f.text(n, cn ? { value: cn, source: F.src('case.number') } : undefined, { item: 'Caption', label: 'Case number', blankReason: 'Blank until the court assigns a number' });
}

// kept for callers: the "attorney for" line of a self-represented petitioner
function petitionerFor(F, form) {
  return filer(F, form).attorneyFor;
}

module.exports = { header, caption, petitionerFor, classify, hasRole };
