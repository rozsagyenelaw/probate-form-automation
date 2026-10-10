# Template revisions (append-only)

Each template in this folder is the publisher's PDF with its owner password and usage-rights
signature removed (`qpdf --decrypt --remove-restrictions`). The untouched download is in
`templates/source/` under the same name.

| Template | Form | Revision (from the footer) | Downloaded from | Downloaded | SHA-1 of the download |
|---|---|---|---|---|---|
| BOE-502-D-LA.pdf | BOE-502-D Change in Ownership Statement, Death of Real Property Owner (Los Angeles County Assessor issue, 2 pages, 95 fields, no XFA) | BOE-502-D (P1) REV. 15 (07-25) ASSR-176 (REV. 10-25) | https://res.cloudinary.com/los-angeles-county-assessor/image/upload/v1622784606/Form/BOE-502-D.pdf (the download link on the LA County Assessor forms page, assessor.lacounty.gov; captured in build-evidence/W3-forms/sources/pages/la-assessor-forms.txt) | 2026-10-10 | ce47d8d11405924072dd2a906dba9d87ade0e8e6 |

Not bundled: the statewide BOE issue of BOE-502-D. https://www.boe.ca.gov/proptaxes/pdf/boe502d.pdf and
the BOE property tax forms page both returned 404 on 2026-10-10. Each county assessor issues its own
BOE-502-D; a parcel outside Los Angeles County needs that assessor's form (the generator refuses it).
