// The caption every Judicial Council probate form shares: attorney block, court block,
// estate name and case number. Field names differ between forms, so header fields are
// recognised by their tooltip and their parent subform. The attorney block is exactly the
// DE-111 block Rozsa approved; the fax line is always blank (house rule: no fax anywhere).
const { PDFTextField } = require('pdf-lib');
const firm = require('./firm');
const { courtFor } = require('./courts');
const { tooltip } = require('./pdf');

const SRC = 'Firm block (lib/formgen/firm.js)';

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
  const blockLines = [
    `${firm.attorneyName} (SBN ${firm.barNumber})`,
    firm.firmName,
    firm.street,
    firm.cityStateZip(),
  ];
  // a form with only one combined box and no separate email field gets the email in the box
  if (!present.has('attyEmail')) blockLines.push(firm.email);
  const lineVals = { attyLine1: `${firm.attorneyName} (SBN ${firm.barNumber})`, attyLine2: firm.firmName, attyLine3: firm.street, attyLine4: firm.cityStateZip(), attyLine5: present.has('attyEmail') ? '' : firm.email };
  for (const [name, role] of roles) {
    const m = { item: 'Caption', label: undefined, source: SRC };
    switch (role) {
      case 'attyBlock': {
        const fld = f.field(name);
        fld.enableMultiline();
        const h = fld.acroField.getWidgets()[0].getRectangle().height;
        fld.setFontSize(Math.max(6, Math.min(9, Math.floor((h - 2) / (blockLines.length * 1.18)))));
        f.text(name, blockLines.join('\n'), { ...m, label: 'Attorney (name, State Bar number, address)' });
        break;
      }
      case 'attyLine1': case 'attyLine2': case 'attyLine3': case 'attyLine4': case 'attyLine5':
        f.text(name, lineVals[role], { ...m, label: `Attorney block line ${role.slice(-1)}`, blankReason: 'Email is in its own field' }); break;
      case 'attyName': f.text(name, firm.attorneyName, { ...m, label: 'Attorney name' }); break;
      case 'attyBar': f.text(name, firm.barNumber, { ...m, label: 'State Bar number' }); break;
      case 'attyFirm': f.text(name, firm.firmName, { ...m, label: 'Firm name' }); break;
      case 'attyStreet': f.text(name, firm.street, { ...m, label: 'Street address' }); break;
      case 'attyCity': f.text(name, firm.city, { ...m, label: 'City' }); break;
      case 'attyState': f.text(name, firm.state, { ...m, label: 'State' }); break;
      case 'attyZip': f.text(name, firm.zip, { ...m, label: 'ZIP code' }); break;
      case 'attyCityStateZip': f.text(name, firm.cityStateZip(), { ...m, label: 'City, state, ZIP' }); break;
      case 'attyPhone': f.text(name, firm.phone, { ...m, label: 'Telephone' }); break;
      case 'attyFax': f.text(name, '', { ...m, label: 'Fax', blankReason: 'No fax (house rule)' }); break;
      case 'attyEmail': f.text(name, firm.email, { ...m, label: 'Email' }); break;
      case 'attyFor': f.text(name, opts.attorneyFor, { ...m, label: 'Attorney for', source: undefined, need: 'petitioner.name' }); break;
      case 'courtCounty': f.text(name, court.county ? { value: court.county.toUpperCase(), source: court.countySource } : undefined, { ...m, label: 'Court county', source: undefined, need: 'court.county' }); break;
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
  for (const n of est) f.text(n, dn ? { value: dn.value.toUpperCase(), source: dn.source } : undefined, { item: 'Caption', label: 'Estate of (name)', need: 'decedent.name' });
  const cn = F.opt('case.number');
  for (const n of cas) f.text(n, cn ? { value: cn, source: F.src('case.number') } : undefined, { item: 'Caption', label: 'Case number', blankReason: 'Blank until the court assigns a number' });
}

function petitionerFor(F, form) {
  const p = F.get('petitioner.name', form);
  return p ? { value: `Petitioner ${p}`, source: F.src('petitioner.name') } : undefined;
}

module.exports = { header, caption, petitionerFor, classify, hasRole };
