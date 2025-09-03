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
      const parts = line.split(',');
      return {
        name: parts[0]?.trim(),
        relationship: parts[1]?.trim(),
        age: parts[2]?.trim(),
        address: parts[3]?.trim(),
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
    },
    petitioner: {
      name: webhookData.petitioner_name,
      relationship: webhookData.petitioner_relationship,
      address: webhookData.petitioner_address,
      phone: webhookData.petitioner_phone,
      is_executor: webhookData.petitioner_is_executor === "yes",
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
      type: webhookData.admin_type,
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

// Fill DE-111 form - COMPLETE with all 4 pages
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
    
    // PAGE 2 - Estate Values (corrected based on actual form structure)
    const page2Fields = {
      // Estate value fields in correct order
      'topmostSubform[0].Page2[0].Page2[0].FillText173[0]': data.estate.personal_property,
      'topmostSubform[0].Page2[0].Page2[0].FillText173[1]': '0.00',
      'topmostSubform[0].Page2[0].Page2[0].FillText162[0]': '0.00',
      'topmostSubform[0].Page2[0].Page2[0].FillText165[0]': data.estate.personal_property,
      'topmostSubform[0].Page2[0].Page2[0].FillText164[0]': data.estate.real_property_gross,
      'topmostSubform[0].Page2[0].Page2[0].FillText163[0]': data.estate.real_property_encumbrance,
      'topmostSubform[0].Page2[0].Page2[0].FillText178[0]': data.estate.real_property_net,
      'topmostSubform[0].Page2[0].Page2[0].FillText177[0]': data.estate.total,
      
      // Will date field
      'topmostSubform[0].Page2[0].Page2[0].FillText179[0]': data.estate.will_date,
      
      // Other text fields
      'topmostSubform[0].Page2[0].Page2[0].FillText181[0]': '',
      'topmostSubform[0].Page2[0].Page2[0].FillText182[0]': '',
      'topmostSubform[0].Page2[0].Page2[0].FillText183[0]': '',
      'topmostSubform[0].Page2[0].Page2[0].FillTxt181[0]': '',
      
      // Case number and estate name
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
    };
    
    // PAGE 3 - Family relationship section
    const page3Fields = {
      // Case number and estate name for Page 3
      'topmostSubform[0].Page3[0].PxCaption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page3[0].PxCaption[0].TitlePartyName[0].Party1[0]': data.decedent.name,
    };
    
    // PAGE 4 - Heirs/Beneficiaries list and signatures
    const page4Fields = {
      // Case number and estate name for Page 4
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Petitioner signature section
      'topmostSubform[0].Page4[0].FillText357[0]': data.petitioner.name,
      'topmostSubform[0].Page4[0].FillText357[1]': '',
      'topmostSubform[0].Page4[0].FillText358[0]': data.petitioner.address,
      'topmostSubform[0].Page4[0].FillText276[0]': formatDate(new Date()),
      'topmostSubform[0].Page4[0].FillText276[1]': '',
      'topmostSubform[0].Page4[0].FillText277[0]': data.petitioner.relationship,
    };
    
    // Add heirs/beneficiaries list (up to 10 entries)
    for (let i = 0; i < Math.min(data.heirs.length, 10); i++) {
      const heir = data.heirs[i];
      page4Fields[`topmostSubform[0].Page4[0].FillText350[${i}]`] = heir.name || '';
      page4Fields[`topmostSubform[0].Page4[0].FillText351[${i}]`] = heir.relationship || '';
      page4Fields[`topmostSubform[0].Page4[0].FillText352[${i}]`] = 
        heir.age ? `Age ${heir.age}, ${heir.address || ''}` : (heir.address || '');
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
    
    // PAGE 2 CHECKBOXES
    const page2Checkboxes = {
      'topmostSubform[0].Page2[0].Page2[0].CheckBox73[0]': data.estate.has_will && !data.administration.bond_required,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox77[0]': !data.estate.has_will,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox57[0]': data.estate.will_self_proving,
      'topmostSubform[0].Page2[0].Page2[0].CheckBox58[0]': data.petitioner.is_executor,
    };
    
    // PAGE 3 CHECKBOXES - Family relationships
    const page3Checkboxes = {
      // Independent Administration
      'topmostSubform[0].Page3[0].CheckBox56[0]': true,
      
      // Marital status
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
      
      // Issue of predeceased child
      'topmostSubform[0].Page3[0].CheckBox45[0]': false,
      'topmostSubform[0].Page3[0].CheckBox45[1]': true,
      
      // Stepchild/foster child
      'topmostSubform[0].Page3[0].CheckBox43[0]': false,
      'topmostSubform[0].Page3[0].CheckBox43[1]': true,
      
      // Parents and other relatives
      'topmostSubform[0].Page3[0].CheckBox41[0]': false,
      'topmostSubform[0].Page3[0].CheckBox40[0]': false,
    };
    
    // PAGE 4 CHECKBOXES
    const page4Checkboxes = {
      'topmostSubform[0].Page4[0].CheckBox82[0]': false,
      'topmostSubform[0].Page4[0].CheckBox83[0]': false,
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

// Fill DE-120 form
async function fillDE120(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-120 has ${fields.length} fields available`);
    
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        if (fieldName.includes('CaseNumber')) {
          textField.setText('To be assigned');
        } else if (fieldName.includes('Party') || fieldName.includes('TitleParty')) {
          textField.setText(data.decedent.name);
        }
      } catch (e) {}
    });
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-120:', error);
    throw error;
  }
}

// Fill DE-140 form
async function fillDE140(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-140 has ${fields.length} fields available`);
    
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        if (fieldName.includes('CaseNumber')) {
          textField.setText('To be assigned');
        } else if (fieldName.includes('Party') || fieldName.includes('TitleParty')) {
          textField.setText(data.decedent.name);
        }
      } catch (e) {}
    });
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-140:', error);
    throw error;
  }
}

// Fill DE-147 form
async function fillDE147(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-147 has ${fields.length} fields available`);
    
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        if (fieldName.includes('CaseNumber')) {
          textField.setText('To be assigned');
        } else if (fieldName.includes('Party') || fieldName.includes('TitleParty')) {
          textField.setText(data.decedent.name);
        }
      } catch (e) {}
    });
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-147:', error);
    throw error;
  }
}

// Main function
async function fillProbateForms(data) {
  const results = {};
  
  const forms = [
    { name: 'DE-111', filler: fillDE111 },
    { name: 'DE-120', filler: fillDE120 },
    { name: 'DE-140', filler: fillDE140 },
    { name: 'DE-147', filler: fillDE147 }
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

// Netlify Function Handler
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
      timestamp: new Date().toISOString(),
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
