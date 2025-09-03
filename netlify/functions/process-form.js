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
      bond_amount: formatCurrency(webhookData.bond_amount),
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

// Fill DE-111 form with CORRECT field names
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
      'topmostSubform[0].Page1[0].FillText141[0]': 'Los Angeles Times', // newspaper
      'topmostSubform[0].Page1[0].FillText142[0]': data.petitioner.name, // petitioner name
      'topmostSubform[0].Page1[0].FillText143[0]': data.petitioner.name, // name for appointment
      'topmostSubform[0].Page1[0].FillText144[0]': data.administration.bond_amount, // bond amount
      'topmostSubform[0].Page1[0].FillText145[0]': '0.00', // blocked account amount
      'topmostSubform[0].Page1[0].FillText146[0]': data.decedent.death_date, // death date
      'topmostSubform[0].Page1[0].FillText147[0]': data.decedent.death_place, // death place
      'topmostSubform[0].Page1[0].FillText148[0]': '', // location for nonresident
      'topmostSubform[0].Page1[0].FillText149[0]': data.decedent.death_address, // residence at death
      'topmostSubform[0].Page1[0].FillText161[0]': '', // institution for blocked account
    };
    
    // Combine all text field mappings
    const allTextFields = {
      ...attorneyFields,
      ...courtFields,
      ...estateFields,
      ...petitionFields
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
    
    // PAGE 1 - Checkboxes
    const checkboxes = {
      // Form title checkboxes (top of form)
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].FormTitle[0].CheckBox23[0]': data.estate.has_will, // Probate of Will
      'topmostSubform[0].Page1[0].StdP1Header_sf[0].FormTitle[0].CheckBox21[0]': !data.estate.has_will, // Letters of Administration
      
      // Publication checkboxes
      'topmostSubform[0].Page1[0].CheckBox1[0]': true, // Publication requested
      'topmostSubform[0].Page1[0].CheckBox1[1]': false, // Publication to be arranged
      
      // Will admission
      'topmostSubform[0].Page1[0].CheckBox3[0]': data.estate.has_will, // admit will to probate
      
      // Appointment type
      'topmostSubform[0].Page1[0].CheckBox5[0]': data.petitioner.is_executor && data.estate.has_will, // executor
      'topmostSubform[0].Page1[0].CheckBox6[0]': !data.petitioner.is_executor && data.estate.has_will, // admin with will
      'topmostSubform[0].Page1[0].CheckBox7[0]': !data.estate.has_will, // administrator
      
      // Authority type
      'topmostSubform[0].Page1[0].CheckBox12[0]': true, // full authority
      'topmostSubform[0].Page1[0].CheckBox12[1]': false, // limited authority
      
      // Bond
      'topmostSubform[0].Page1[0].CheckBox11[0]': !data.administration.bond_required, // bond not required
      'topmostSubform[0].Page1[0].CheckBox13[0]': data.administration.bond_required, // bond required
      
      // Residency
      'topmostSubform[0].Page1[0].CheckBox15[0]': data.decedent.is_resident, // resident
      'topmostSubform[0].Page1[0].CheckBox15[1]': !data.decedent.is_resident, // nonresident
    };
    
    // Set all checkboxes
    for (const [fieldName, shouldCheck] of Object.entries(checkboxes)) {
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
    
    // Now handle Pages 2, 3, 4 - we need to get their field mappings too
    // For now, let's just set the case number and estate name on all pages
    const otherPageFields = {
      // Page 2
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Page 3
      'topmostSubform[0].Page3[0].PxCaption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page3[0].PxCaption[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Page 4
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
    };
    
    for (const [fieldName, value] of Object.entries(otherPageFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
      } catch (e) {
        console.log(`Could not set field ${fieldName}`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-111:', error);
    throw error;
  }
}

// Fill DE-120 form - you'll need to get field names for this form too
async function fillDE120(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-120 has ${fields.length} fields available`);
    
    // Fill fields based on patterns until we get exact field names
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

// Main function to fill all forms
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
