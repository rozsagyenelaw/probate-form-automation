const { PDFDocument } = require('pdf-lib');

// Helper functions
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (!value) return "0.00";
  const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
  return num.toFixed(2);
}

function parseHeirs(heirsList) {
  if (typeof heirsList === 'string') {
    return heirsList.split('\n').map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        name: parts[0] || '',
        relationship: parts[1] || '',
        age: parts[2] || '',
        address: parts[3] || '',
      };
    });
  }
  return heirsList || [];
}

// Transform webhook data
function transformQuestionnaireData(webhookData) {
  const personal = parseFloat((webhookData.personal_property_value || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const grossReal = parseFloat((webhookData.real_property_gross || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const encumbrance = parseFloat((webhookData.real_property_encumbrance || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const netReal = Math.max(0, grossReal - encumbrance);
  const total = personal + netReal;
  
  return {
    attorney: {
      name: webhookData.attorney_name || "ROZSA GYENE, ESQ.",
      bar_number: webhookData.attorney_bar || "208356",
      firm_name: webhookData.firm_name || "LAW OFFICES OF ROZSA GYENE",
      street: webhookData.firm_street || "450 N BRAND BLVD SUITE 600",
      city: webhookData.firm_city || "GLENDALE",
      state: webhookData.firm_state || "CA",
      zip: webhookData.firm_zip || "91203",
      phone: webhookData.firm_phone || "818-291-6217",
      fax: webhookData.firm_fax || "818-291-6205",
      email: webhookData.firm_email || "ROZSAGYENELAW@YAHOO.COM",
    },
    decedent: {
      name: webhookData.decedent_name,
      death_date: formatDate(webhookData.death_date),
      death_place: webhookData.death_place,
      death_address: webhookData.death_address,
      is_resident: webhookData.death_resident === "yes",
      has_spouse: webhookData.has_spouse === "yes",
      has_children: webhookData.has_children === "yes",
      has_grandchildren: webhookData.has_grandchildren === "yes",
    },
    petitioner: {
      name: webhookData.petitioner_name,
      relationship: webhookData.petitioner_relationship,
      address: webhookData.petitioner_address,
      phone: webhookData.petitioner_phone,
      is_executor: webhookData.petitioner_is_executor === "yes",
      executor_named_in_will: webhookData.executor_named_in_will === "yes",
    },
    estate: {
      personal_property: formatCurrency(personal),
      real_property_gross: formatCurrency(grossReal),
      real_property_encumbrance: formatCurrency(encumbrance),
      real_property_net: formatCurrency(netReal),
      total: formatCurrency(total),
      has_will: webhookData.has_will === "yes",
      will_date: formatDate(webhookData.will_date),
      will_self_proving: webhookData.will_self_proving === "yes",
    },
    heirs: parseHeirs(webhookData.heirs_list),
    administration: {
      type: webhookData.admin_type || "full",
      bond_required: webhookData.bond_required === "yes",
      bond_amount: formatCurrency(webhookData.bond_amount || 0),
    },
    court: {
      county: webhookData.court_county || "LOS ANGELES",
      branch: webhookData.court_branch || "STANLEY MOSK COURTHOUSE",
      street: "111 N HILL ST",
      city: "LOS ANGELES",
      zip: "90012",
    },
    hearing: {
      date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      time: "9:00 AM",
      dept: "11",
      room: "Room 312"
    }
  };
}

// Load PDF from deployed Netlify site
async function loadPDFFromRepo(filename) {
  const fetch = (await import('node-fetch')).default;
  const url = `https://probateformautomation.netlify.app/templates/${filename}`;
  
  try {
    console.log(`Loading ${filename} from deployed site...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}

// Fill DE-111 form with CORRECTED field mapping
async function fillDE111(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    const fields = form.getFields();
    console.log(`DE-111 has ${fields.length} fields available`);
    
    // PAGE 1 HEADER - Attorney Information Box
    const attorneyFields = {
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyName_ft[0]': data.attorney.name,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyBarNo_dc[0]': data.attorney.bar_number,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyFirm_ft[0]': data.attorney.firm_name,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyStreet_ft[0]': data.attorney.street,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyCity_ft[0]': data.attorney.city,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyState_ft[0]': data.attorney.state,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyZip_ft[0]': data.attorney.zip,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].Phone_ft[0]': data.attorney.phone,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].Fax_ft[0]': data.attorney.fax,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].Email_ft[0]': data.attorney.email,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].AttyInfo[0].AttyFor_ft[0]': `Petitioner ${data.petitioner.name}`,
    };
    
    // PAGE 1 HEADER - Court Information
    const courtFields = {
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CourtInfo[0].CrtCounty_ft[0]': data.court.county,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CourtInfo[0].Street_ft[0]': data.court.street,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CourtInfo[0].MailingAdd_ft[0]': data.court.street,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CourtInfo[0].CityZip_ft[0]': `${data.court.city}, CA ${data.court.zip}`,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CourtInfo[0].Branch_ft[0]': data.court.branch,
    };
    
    // PAGE 1 HEADER - Estate Information
    const estateFields = {
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
    };
    
    // PAGE 1 BODY - Petition Details
    const petitionFields = {
      'topmostSubform[0].Page1[0].FillText141[0]': 'Los Angeles Times',
      'topmostSubform[0].Page1[0].FillText142[0]': data.petitioner.name,
      'topmostSubform[0].Page1[0].FillText143[0]': data.petitioner.name,
      'topmostSubform[0].Page1[0].FillText144[0]': data.administration.bond_amount,
      'topmostSubform[0].Page1[0].FillText145[0]': '0.00',
      'topmostSubform[0].Page1[0].FillText146[0]': data.decedent.death_date,
      'topmostSubform[0].Page1[0].FillText147[0]': data.decedent.death_place,
      'topmostSubform[0].Page1[0].FillText148[0]': '',
      'topmostSubform[0].Page1[0].FillText149[0]': data.decedent.death_address,
      'topmostSubform[0].Page1[0].FillText161[0]': '',
    };
    
    // PAGE 2 - All fields including estate values
    const page2Fields = {
      // Estate value fields (3.d)
      'topmostSubform[0].Page2[0].Page2[0].FillText173[0]': data.estate.personal_property,
      'topmostSubform[0].Page2[0].Page2[0].FillText173[1]': '0.00',
      'topmostSubform[0].Page2[0].Page2[0].FillText162[0]': '0.00',
      'topmostSubform[0].Page2[0].Page2[0].FillText165[0]': data.estate.personal_property,
      'topmostSubform[0].Page2[0].Page2[0].FillText164[0]': data.estate.real_property_gross,
      'topmostSubform[0].Page2[0].Page2[0].FillText163[0]': data.estate.real_property_encumbrance,
      'topmostSubform[0].Page2[0].Page2[0].FillText178[0]': data.estate.real_property_net,
      'topmostSubform[0].Page2[0].Page2[0].FillText177[0]': data.estate.total,
      
      // Section 3.f - Will date
      'topmostSubform[0].Page2[0].Page2[0].FillText179[0]': data.estate.will_date,
      'topmostSubform[0].Page2[0].Page2[0].FillText181[0]': '', // Codicil dates
      
      // Section 3.g(1)(d) - Other executors who won't act
      'topmostSubform[0].Page2[0].Page2[0].FillText182[0]': '', // Other reasons specify
      
      // Section 3.g(2)(c) - Relationship to decedent
      'topmostSubform[0].Page2[0].Page2[0].FillTxt181[0]': data.petitioner.relationship,
      
      // Section 3.h - Non-resident address
      'topmostSubform[0].Page2[0].Page2[0].FillText183[0]': '', // Permanent address
      
      // Case number and estate name
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
    };
    
    // PAGE 3 - Family relationship section
    const page3Fields = {
      'topmostSubform[0].Page3[0].PxCaption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page3[0].PxCaption[0].TitlePartyName[0].Party1[0]': data.decedent.name,
    };
    
    // PAGE 4 - Heirs/Beneficiaries list and signatures
    const page4Fields = {
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // CORRECTED - Attorney signature section (not petitioner)
      'topmostSubform[0].Page4[0].FillText357[0]': data.attorney.name, // Attorney name
      'topmostSubform[0].Page4[0].FillText357[1]': data.petitioner.name, // Petitioner name
      'topmostSubform[0].Page4[0].FillText358[0]': '', // Additional petitioner if needed
      'topmostSubform[0].Page4[0].FillText276[0]': formatDate(new Date()), // Attorney date
      'topmostSubform[0].Page4[0].FillText276[1]': formatDate(new Date()), // Petitioner date
      'topmostSubform[0].Page4[0].FillText277[0]': '', // Additional petitioner date
    };
    
    // PAGE 4 - Heirs/Beneficiaries list mapping 
    // Fill all 10 heir slots to ensure proper positioning
    for (let i = 0; i < 10; i++) {
      if (i < data.heirs.length) {
        const heir = data.heirs[i];
        let nameAndRelationship = heir.name || '';
        if (heir.relationship) {
          nameAndRelationship += `, ${heir.relationship}`;
        }
        page4Fields[`topmostSubform[0].Page4[0].FillText352[${i}]`] = nameAndRelationship;
        page4Fields[`topmostSubform[0].Page4[0].FillText351[${i}]`] = heir.age || '';
        page4Fields[`topmostSubform[0].Page4[0].FillText350[${i}]`] = heir.address || '';
      } else {
        // Fill empty slots to ensure proper positioning
        page4Fields[`topmostSubform[0].Page4[0].FillText352[${i}]`] = '';
        page4Fields[`topmostSubform[0].Page4[0].FillText351[${i}]`] = '';
        page4Fields[`topmostSubform[0].Page4[0].FillText350[${i}]`] = '';
      }
    }
    
    // Combine all text field mappings
    const allTextFields = {
      ...attorneyFields,
      ...courtFields,
      ...estateFields,
      ...petitionFields,
      ...page2Fields,
      ...page3Fields,
      ...page4Fields
    };
    
    // Fill all text fields
    for (const [fieldName, value] of Object.entries(allTextFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`Set ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    // PAGE 1 CHECKBOXES
    const page1Checkboxes = {
      // Form title checkboxes
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].FormTitle[0].CheckBox23[0]': data.estate.has_will,
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].FormTitle[0].CheckBox21[0]': !data.estate.has_will,
      
      // Publication checkboxes
      'topmostSubform[0].Page1[0].CheckBox1[0]': true,
      'topmostSubform[0].Page1[0].CheckBox1[1]': false,
      
      // Will and appointment checkboxes
      'topmostSubform[0].Page1[0].CheckBox3[0]': data.estate.has_will,
      'topmostSubform[0].Page1[0].CheckBox5[0]': data.petitioner.is_executor && data.estate.has_will,
      'topmostSubform[0].Page1[0].CheckBox6[0]': !data.petitioner.is_executor && data.estate.has_will,
      'topmostSubform[0].Page1[0].CheckBox7[0]': !data.estate.has_will,
      
      // Authority checkboxes
      'topmostSubform[0].Page1[0].CheckBox12[0]': true,
      'topmostSubform[0].Page1[0].CheckBox12[1]': false,
      
      // Bond checkboxes
      'topmostSubform[0].Page1[0].CheckBox11[0]': !data.administration.bond_required,
      'topmostSubform[0].Page1[0].CheckBox13[0]': data.administration.bond_required,
      
      // Residency checkboxes
      'topmostSubform[0].Page1[0].CheckBox15[0]': data.decedent.is_resident,
      'topmostSubform[0].Page1[0].CheckBox15[1]': !data.decedent.is_resident,
    };
    
    // PAGE 2 CHECKBOXES - Complete all sections 3.e through 3.h - UPDATED SECTION G LOGIC
    const page2Checkboxes = {
      // Section 3.e - Bond waivers
      'topmostSubform[0].Page2[0].Page2[0].CheckBox73[0]': data.estate.has_will && !data.administration.bond_required,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox72[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox74[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox75[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox76[0]': false,
      
      // Section 3.f - Will/intestate
      'topmostSubform[0].Page2[0].Page2[0].CheckBox77[0]': !data.estate.has_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox78[0]': data.estate.has_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox79[0]': false, // Codicil
      'topmostSubform[0].Page2[0].Page2[0].CheckBox57[0]': data.estate.will_self_proving,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox80[0]': false, // Lost will
      
      // CORRECTED Section 3.g(1) - Appointment with WILL
      'topmostSubform[0].Page2[0].Page2[0].CheckBox58[0]': data.estate.has_will && data.petitioner.executor_named_in_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox59[0]': data.estate.has_will && !data.petitioner.executor_named_in_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox60[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox61[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox63[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox62[0]': false,
      
      // CORRECTED Section 3.g(2) - Appointment WITHOUT WILL (intestate)
      'topmostSubform[0].Page2[0].Page2[0].CheckBox65[0]': !data.estate.has_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox66[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox67[0]': !data.estate.has_will,
      
      // Section 3.g(3) and (4) - Special administrator
      'topmostSubform[0].Page2[0].Page2[0].CheckBox68[0]': false,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox69[0]': false,
      
      // Section 3.h - Residency
      'topmostSubform[0].Page2[0].Page2[0].CheckBox70[0]': true, // Resident of California
      'topmostSubform[0].Page2[0].Page2[0].CheckBox70[1]': false, // Non-resident of California
      'topmostSubform[0].Page2[0].Page2[0].CheckBox81[0]': true, // Resident of US
      'topmostSubform[0].Page2[0].Page2[0].CheckBox81[1]': false, // Non-resident of US
    };
    
    // PAGE 3 CHECKBOXES - Family relationships
    const page3Checkboxes = {
      // Item 4 - Independent Administration
      'topmostSubform[0].Page3[0].CheckBox56[0]': true,
      
      // Item 5 - Marital status
      'topmostSubform[0].Page3[0].CheckBox55[0]': data.decedent.has_spouse,
      'topmostSubform[0].Page3[0].CheckBox55[1]': !data.decedent.has_spouse,
      'topmostSubform[0].Page3[0].CheckBox53[0]': !data.decedent.has_spouse,
      'topmostSubform[0].Page3[0].CheckBox52[0]': false,
      
      // Domestic partner
      'topmostSubform[0].Page3[0].CheckBox51[0]': false,
      'topmostSubform[0].Page3[0].CheckBox51[1]': true,
      
      // Children
      'topmostSubform[0].Page3[0].CheckBox49[0]': data.decedent.has_children,
      'topmostSubform[0].Page3[0].CheckBox48[0]': data.decedent.has_children,
      'topmostSubform[0].Page3[0].CheckBox47[0]': false,
      'topmostSubform[0].Page3[0].CheckBox49[1]': !data.decedent.has_children,
      
      // Issue of predeceased child (grandchildren)
      'topmostSubform[0].Page3[0].CheckBox45[0]': data.decedent.has_grandchildren,
      'topmostSubform[0].Page3[0].CheckBox45[1]': !data.decedent.has_grandchildren,
      
      // Stepchild/foster child
      'topmostSubform[0].Page3[0].CheckBox43[0]': false,
      'topmostSubform[0].Page3[0].CheckBox43[1]': true,
      
      // Item 6 - Parents and other relatives
      'topmostSubform[0].Page3[0].CheckBox41[0]': false,
      'topmostSubform[0].Page3[0].CheckBox40[0]': false,
      'topmostSubform[0].Page3[0].CheckBox39[0]': false,
      'topmostSubform[0].Page3[0].CheckBox38[0]': false,
      'topmostSubform[0].Page3[0].CheckBox37[0]': false,
      'topmostSubform[0].Page3[0].CheckBox36[0]': false,
      'topmostSubform[0].Page3[0].CheckBox35[0]': false,
      'topmostSubform[0].Page3[0].CheckBox34[0]': false,
      
      // Item 7 - Predeceased spouse
      'topmostSubform[0].Page3[0].CheckBox33[0]': false,
      'topmostSubform[0].Page3[0].CheckBox32[0]': false,
      'topmostSubform[0].Page3[0].CheckBox31[0]': false,
      'topmostSubform[0].Page3[0].CheckBox30[0]': false,
    };
    
    // PAGE 4 CHECKBOXES
    const page4Checkboxes = {
      'topmostSubform[0].Page4[0].CheckBox82[0]': false, // Continued on Attachment 8
      'topmostSubform[0].Page4[0].CheckBox83[0]': false, // Additional petitioners
    };
    
    // Set all checkboxes
    const allCheckboxes = {...page1Checkboxes, ...page2Checkboxes, ...page3Checkboxes, ...page4Checkboxes};
    for (const [fieldName, shouldCheck] of Object.entries(allCheckboxes)) {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (shouldCheck) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        console.log(`${shouldCheck ? 'Checked' : 'Unchecked'} ${fieldName}`);
      } catch (e) {
        console.log(`Could not set checkbox ${fieldName}: ${e.message}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-111:', error);
    throw error;
  }
}

// Fill DE-120 form with UPDATED HEIR MAILING LIST
async function fillDE120(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-120 has ${fields.length} fields available`);
    
    // Page 1 - Attorney/Party Information
    const attorneyFields = {
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].AttyBarNo[0]': data.attorney.bar_number,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Name[0]': data.attorney.name,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].AttyFirm[0]': data.attorney.firm_name,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Street[0]': data.attorney.street,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].City[0]': data.attorney.city,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].State[0]': data.attorney.state,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Zip[0]': data.attorney.zip,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Phone[0]': data.attorney.phone,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Fax[0]': data.attorney.fax,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].Email[0]': data.attorney.email,
      'DE-120[0].Page1[0].p1Caption[0].AttyPartyInfo[0].AttyFor[0]': `Petitioner ${data.petitioner.name}`,
    };
    
    // Court Information
    const courtFields = {
      'DE-120[0].Page1[0].p1Caption[0].CourtInfo[0].CrtCounty[0]': data.court.county,
      'DE-120[0].Page1[0].p1Caption[0].CourtInfo[0].CrtStreet[0]': data.court.street,
      'DE-120[0].Page1[0].p1Caption[0].CourtInfo[0].CrtMailingAdd[0]': data.court.street,
      'DE-120[0].Page1[0].p1Caption[0].CourtInfo[0].CrtCityZip[0]': `${data.court.city}, CA ${data.court.zip}`,
      'DE-120[0].Page1[0].p1Caption[0].CourtInfo[0].CrtBranch[0]': data.court.branch,
    };
    
    // Case Information
    const caseFields = {
      'DE-120[0].Page1[0].p1Caption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'DE-120[0].Page1[0].p1Caption[0].TitlePartyName[0].name_tf[0]': data.decedent.name,
    };
    
    // Notice Information
    const noticeFields = {
      'DE-120[0].Page1[0].Name1[0]': data.petitioner.name,
      'DE-120[0].Page1[0].Capacity1[0]': 'Petitioner',
      'DE-120[0].Page1[0].Description1[0]': 'Petition for Probate',
    };
    
    // Hearing Information
    const hearingFields = {
      'DE-120[0].Page1[0].HearingInfo[0].HearingDate[0]': data.hearing.date,
      'DE-120[0].Page1[0].HearingInfo[0].HearingTime[0]': data.hearing.time,
      'DE-120[0].Page1[0].HearingInfo[0].HearingRm[0]': data.hearing.room,
      'DE-120[0].Page1[0].HearingInfo[0].HearingDept[0]': data.hearing.dept,
      'DE-120[0].Page1[0].HearingInfo[0].HearingAdd[0].HearingCourtAdd[0]': '',
    };
    
    // Page 2 - Repeated fields and HEIR MAILING LIST
    const page2Fields = {
      'DE-120[0].#subform[1].TitlePartyName[0].name_tf[0]': data.decedent.name,
      'DE-120[0].#subform[1].CaseNumber[0].CaseNumber[0]': 'To be assigned',
    };
    
    // ADD HEIRS TO MAILING LIST ON PAGE 2
    for (let i = 0; i < Math.min(data.heirs.length, 5); i++) {
      const heir = data.heirs[i];
      page2Fields[`DE-120[0].#subform[1].NameAdd_tf[${i}]`] = heir.name || '';
      page2Fields[`DE-120[0].#subform[1].AddressSt_tf[${i}]`] = heir.address || '';
    }
    
    // Combine all text fields
    const allTextFields = {
      ...attorneyFields,
      ...courtFields,
      ...caseFields,
      ...noticeFields,
      ...hearingFields,
      ...page2Fields
    };
    
    // Fill all text fields
    for (const [fieldName, value] of Object.entries(allTextFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`DE-120: Set ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`DE-120: Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    // Set checkboxes
    const checkboxes = {
      'DE-120[0].Page1[0].#area[1].name_cb[1]': true, // Estate of
      'DE-120[0].Page1[0].#area[2].status_cb[0]': true, // Decedent
      'DE-120[0].#subform[1].TitlePartyName[0].#area[1].name_cb[1]': true, // Estate of (page 2)
      'DE-120[0].#subform[1].TitlePartyName[0].#area[2].status_cb[0]': true, // Decedent (page 2)
    };
    
    for (const [fieldName, shouldCheck] of Object.entries(checkboxes)) {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (shouldCheck) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        console.log(`DE-120: ${shouldCheck ? 'Checked' : 'Unchecked'} ${fieldName}`);
      } catch (e) {
        console.log(`DE-120: Could not set checkbox ${fieldName}: ${e.message}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-120:', error);
    throw error;
  }
}

// Fill DE-140 form with NEW MAPPINGS
async function fillDE140(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-140 has ${fields.length} fields available`);
    
    // Attorney Information - note: TextField1[0] contains full attorney info
    const attorneyFields = {
      'DE-140[0].Page1[0].P1Caption[0].AttyPartyInfo[0].TextField1[0]': `${data.attorney.name}\n${data.attorney.bar_number}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`,
      'DE-140[0].Page1[0].P1Caption[0].AttyPartyInfo[0].Phone[0]': data.attorney.phone,
      'DE-140[0].Page1[0].P1Caption[0].AttyPartyInfo[0].Email[0]': `Petitioner ${data.petitioner.name}`,
    };
    
    // Court Information
    const courtFields = {
      'DE-140[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]': data.court.county,
      'DE-140[0].Page1[0].P1Caption[0].CourtInfo[0].CrtStreet[0]': data.court.street,
      'DE-140[0].Page1[0].P1Caption[0].CourtInfo[0].CrtMailingAdd[0]': data.court.street,
      'DE-140[0].Page1[0].P1Caption[0].CourtInfo[0].CrtBranch[0]': data.court.branch,
      'DE-140[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCityZip[0]': `${data.court.city}, CA ${data.court.zip}`,
    };
    
    // Case Information
    const caseFields = {
      'DE-140[0].Page1[0].P1Caption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'DE-140[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1_ft[0]': data.decedent.name,
    };
    
    // Death Information
    const deathFields = {
      'DE-140[0].Page1[0].FillText143[0]': data.decedent.death_date,
      'DE-140[0].Page1[0].FillText1[0]': data.estate.will_date, // will dated
      'DE-140[0].Page1[0].FillText1[1]': '', // codicil dated
      'DE-140[0].Page1[0].FillText1[2]': '', // admitted to probate date
    };
    
    // Appointment Information
    const appointmentFields = {
      'DE-140[0].Page1[0].FillText1[3]': data.petitioner.name, // appointee name
      'DE-140[0].Page1[0].FillText1[5]': data.petitioner.name, // duty name
    };
    
    // Hearing Information
    const hearingFields = {
      'DE-140[0].Page1[0].HearingDate[0]': data.hearing.date,
      'DE-140[0].Page1[0].HearingTime[0]': data.hearing.time,
      'DE-140[0].Page1[0].HearingDept[0]': data.hearing.dept,
      'DE-140[0].Page1[0].HearingRm[0]': '', // Judge name
    };
    
    // Bond Information
    const bondFields = {
      'DE-140[0].Page1[0].HearingTime[1]': data.administration.bond_amount, // bond amount
      'DE-140[0].Page1[0].HearingTime[2]': '0', // deposits amount
      'DE-140[0].Page1[0].FillText1[4]': '', // institution location
    };
    
    // Judge Signature
    const signatureFields = {
      'DE-140[0].Page1[0].SigDate[0]': formatDate(new Date()), // judge signature date
      'DE-140[0].Page1[0].SigDate[1]': '', // expire date for special admin
      'DE-140[0].Page1[0].NumericField1[0]': '0', // pages attached
    };
    
    // Combine all text fields
    const allTextFields = {
      ...attorneyFields,
      ...courtFields,
      ...caseFields,
      ...deathFields,
      ...appointmentFields,
      ...hearingFields,
      ...bondFields,
      ...signatureFields
    };
    
    // Fill all text fields
    for (const [fieldName, value] of Object.entries(allTextFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`DE-140: Set ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`DE-140: Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    // Set checkboxes
    const checkboxes = {
      // Order type at top
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox23[0]': data.petitioner.is_executor && data.estate.has_will, // Executor
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox22[0]': !data.petitioner.is_executor && data.estate.has_will, // Admin with will
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox21[0]': !data.estate.has_will, // Administrator
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox20[0]': false, // Special administrator
      
      // Independent Administration
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox17[0]': true, // Order authorizing
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox18[0]': false, // limited authority
      'DE-140[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox18[1]': true, // full authority
      
      // Death location
      'DE-140[0].Page1[0].CheckBox45[0]': data.decedent.is_resident, // resident
      'DE-140[0].Page1[0].CheckBox45[1]': !data.decedent.is_resident, // nonresident
      
      // Intestate/testate
      'DE-140[0].Page1[0].CheckBox89[0]': !data.estate.has_will, // intestate
      'DE-140[0].Page1[0].CheckBox89[1]': data.estate.has_will, // testate
      
      // Appointment type
      'DE-140[0].Page1[0].Choice1[0]': data.petitioner.is_executor && data.estate.has_will, // executor
      'DE-140[0].Page1[0].Choice1[1]': !data.petitioner.is_executor && data.estate.has_will, // admin with will
      'DE-140[0].Page1[0].Choice1[2]': !data.estate.has_will, // administrator
      'DE-140[0].Page1[0].Choice2[0]': false, // special administrator
      
      // Authority granted
      'DE-140[0].Page1[0].CheckBox41[0]': true, // full authority
      'DE-140[0].Page1[0].CheckBox41[1]': false, // limited authority
      
      // Bond
      'DE-140[0].Page1[0].Choice1[3]': !data.administration.bond_required, // bond not required
      'DE-140[0].Page1[0].Choice1[4]': data.administration.bond_required, // bond required
      'DE-140[0].Page1[0].Choice1[5]': false, // deposits
      
      // Other checkboxes
      'DE-140[0].Page1[0].CheckBox5[0]': false, // general powers
      'DE-140[0].Page1[0].CheckBox6[0]': false, // special powers
      'DE-140[0].Page1[0].CheckBox7[0]': false, // without notice
      'DE-140[0].Page1[0].CheckBox8[0]': false, // letters expire
      'DE-140[0].Page1[0].CheckBox5[1]': false, // duty checkbox
      'DE-140[0].Page1[0].Choice1[6]': false, // not authorized possession
      'DE-140[0].Page1[0].limited[0]': false, // additional orders
      'DE-140[0].Page1[0].limited[1]': false, // signature follows attachment
    };
    
    for (const [fieldName, shouldCheck] of Object.entries(checkboxes)) {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (shouldCheck) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        console.log(`DE-140: ${shouldCheck ? 'Checked' : 'Unchecked'} ${fieldName}`);
      } catch (e) {
        console.log(`DE-140: Could not set checkbox ${fieldName}: ${e.message}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-140:', error);
    throw error;
  }
}

// Fill DE-147 form with NEW MAPPINGS
async function fillDE147(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-147 has ${fields.length} fields available`);
    
    // Page 1 - Court Information
    const courtFields = {
      'DE-147[0].Page1[0].CourtInfo[0].CrtCounty_ft[0]': data.court.county,
      'DE-147[0].Page1[0].CourtInfo[0].Branch_ft[0]': data.court.branch,
      'DE-147[0].Page1[0].CourtInfo[0].CityZip_ft[0]': `${data.court.city}, CA ${data.court.zip}`,
      'DE-147[0].Page1[0].CourtInfo[0].Street_ft[0]': data.court.street,
      'DE-147[0].Page1[0].CourtInfo[0].MailingAdd_ft[0]': data.court.street,
    };
    
    // Estate Information
    const estateFields = {
      'DE-147[0].Page1[0].TitlePartyName[0].name_tf[0]': data.decedent.name,
      'DE-147[0].Page1[0].CaseNumber[0].CaseNumber_ft[0]': 'To be assigned',
    };
    
    // Attorney Information - TextField1[0] contains full attorney info
    const attorneyFields = {
      'DE-147[0].Page1[0].AttyPartyInfo[0].TextField1[0]': `${data.attorney.name}\n${data.attorney.bar_number}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`,
      'DE-147[0].Page1[0].AttyPartyInfo[0].Phone[0]': data.attorney.phone,
      'DE-147[0].Page1[0].AttyPartyInfo[0].Fax[0]': data.attorney.fax,
      'DE-147[0].Page1[0].AttyPartyInfo[0].Email[0]': data.attorney.email,
      'DE-147[0].Page1[0].AttyPartyInfo[0].Email[1]': `Petitioner ${data.petitioner.name}`,
    };
    
    // Page 2 - Acknowledgment Section
    const page2Fields = {
      'DE-147[0].Page2[0].TEXT\\.5\\.1\\.1[0]': `${data.petitioner.name}\n${data.petitioner.address}\n${data.petitioner.phone}`,
      'DE-147[0].Page2[0].CaseNumber[0].CaseNumber_ft[0]': 'To be assigned',
      'DE-147[0].Page2[0].TitlePartyName[0].name_tf[0]': data.decedent.name,
    };
    
    // Signatures
    const signatureFields = {
      'DE-147[0].Page2[0].SigDate[0]': formatDate(new Date()),
      'DE-147[0].Page2[0].SigName[0]': data.petitioner.name,
      'DE-147[0].Page2[0].SigDate[1]': '', // second signature if needed
      'DE-147[0].Page2[0].SigName[1]': '', // second signer if needed
    };
    
    // Combine all text fields
    const allTextFields = {
      ...courtFields,
      ...estateFields,
      ...attorneyFields,
      ...page2Fields,
      ...signatureFields
    };
    
    // Fill all text fields
    for (const [fieldName, value] of Object.entries(allTextFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`DE-147: Set ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`DE-147: Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-147:', error);
    throw error;
  }
}

// NEW FUNCTION - Fill DE-150 form
async function fillDE150(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    console.log(`DE-150 has ${form.getFields().length} fields available`);
    
    // Text fields
    const textFields = {
      // Court info
      'DE-150[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]': data.court.county,
      'DE-150[0].Page1[0].P1Caption[0].CourtInfo[0].CrtStreet[0]': data.court.street,
      'DE-150[0].Page1[0].P1Caption[0].CourtInfo[0].CrtMailingAdd[0]': data.court.street,
      'DE-150[0].Page1[0].P1Caption[0].CourtInfo[0].CrtBranch[0]': data.court.branch,
      'DE-150[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCityZip[0]': `${data.court.city}, CA ${data.court.zip}`,
      
      // Case info
      'DE-150[0].Page1[0].P1Caption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'DE-150[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1_ft[0]': data.decedent.name,
      
      // Attorney info
      'DE-150[0].Page1[0].P1Caption[0].AttyPartyInfo[0].TextField1[0]': 
        `${data.attorney.name}\n${data.attorney.bar_number}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`,
      'DE-150[0].Page1[0].P1Caption[0].AttyPartyInfo[0].Phone[0]': data.attorney.phone,
      'DE-150[0].Page1[0].P1Caption[0].AttyPartyInfo[0].Email[0]': `Petitioner ${data.petitioner.name}`,
      
      // Names
      'DE-150[0].Page1[0].FillText1[0]': data.petitioner.name,
      'DE-150[0].Page1[0].FillText1[2]': data.petitioner.name,
      
      // Execution
      'DE-150[0].Page1[0].HearingTime[0]': formatDate(new Date()),
      'DE-150[0].Page1[0].FillText1[1]': 'Clerk of the Superior Court',
    };
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(textFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`DE-150: Set ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`DE-150: Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    // Checkboxes based on will/intestate
    const checkboxes = {
      // Letters type (top of form)
      'DE-150[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox23[0]': data.estate.has_will && data.petitioner.is_executor, // Testamentary
      'DE-150[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox22[0]': data.estate.has_will && !data.petitioner.is_executor, // Admin with will
      'DE-150[0].Page1[0].P1Caption[0].FormTitle[0].CheckBox21[0]': !data.estate.has_will, // Administration
      
      // Section 1 - Will proved (checkbox for will)
      'DE-150[0].Page1[0].Choice1[4]': data.estate.has_will, // Will proved checkbox
      
      // Appointment type for will
      'DE-150[0].Page1[0].Choice1[0]': data.estate.has_will && data.petitioner.is_executor, // executor
      'DE-150[0].Page1[0].Choice1[1]': data.estate.has_will && !data.petitioner.is_executor, // admin with will
      
      // Section 2 - Court appoints (checkbox for intestate)
      'DE-150[0].Page1[0].Choice1[5]': !data.estate.has_will, // Court appoints checkbox
      'DE-150[0].Page1[0].Choice1[6]': !data.estate.has_will, // administrator
      
      // Authority
      'DE-150[0].Page1[0].Choice1[2]': true, // Independent admin
      'DE-150[0].Page1[0].Choice2[0]': data.administration.type === 'full', // full authority
      'DE-150[0].Page1[0].Choice2[1]': data.administration.type === 'limited', // limited authority
      
      // Affirmation
      'DE-150[0].Page1[0].Choice1[9]': true, // Individual affirm
    };
    
    for (const [fieldName, shouldCheck] of Object.entries(checkboxes)) {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (shouldCheck) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        console.log(`DE-150: ${shouldCheck ? 'Checked' : 'Unchecked'} ${fieldName}`);
      } catch (e) {
        console.log(`DE-150: Could not set checkbox ${fieldName}: ${e.message}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-150:', error);
    throw error;
  }
}

// Main function - UPDATED TO INCLUDE DE-150
async function fillProbateForms(data) {
  const results = {};
  
  const forms = [
    { name: 'DE-111', filler: fillDE111 },
    { name: 'DE-120', filler: fillDE120 },
    { name: 'DE-140', filler: fillDE140 },
    { name: 'DE-147', filler: fillDE147 },
    { name: 'DE-150', filler: fillDE150 }, // NEW FORM ADDED
  ];
  
  for (const { name, filler } of forms) {
    try {
      console.log(`Processing ${name}...`);
      const pdfBytes = await loadPDFFromRepo(`${name}.pdf`);
      results[name] = await filler(data, pdfBytes);
      console.log(`${name} completed`);
    } catch (error) {
      console.error(`Error with ${name}:`, error);
      results[name] = Buffer.from(`Error processing ${name}`);
    }
  }
  
  return results;
}

// Netlify Function Handler - UPDATED TO INCLUDE DE-150
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const webhookData = JSON.parse(event.body);
    
    console.log('Received form submission for:', webhookData.decedent_name);
    
    const transformedData = transformQuestionnaireData(webhookData);
    
    console.log('Data transformed, filling PDFs...');
    
    const pdfs = await fillProbateForms(transformedData);
    
    const response = {
      success: true,
      message: 'PDFs generated successfully',
      timestamp: new Date().toISOString().split('T')[0],
      metadata: {
        decedent: transformedData.decedent.name,
        petitioner: transformedData.petitioner.name,
        estate_value: transformedData.estate.total,
        forms_generated: Object.keys(pdfs).filter(key => pdfs[key].length > 50)
      },
      pdfs: {
        'DE-111': Buffer.from(pdfs['DE-111']).toString('base64'),
        'DE-120': Buffer.from(pdfs['DE-120']).toString('base64'),
        'DE-140': Buffer.from(pdfs['DE-140']).toString('base64'),
        'DE-147': Buffer.from(pdfs['DE-147']).toString('base64'),
        'DE-150': Buffer.from(pdfs['DE-150']).toString('base64'), // NEW FORM ADDED
      }
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('Error processing form:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Failed to process form',
        details: error.message 
      }),
    };
  }
};
