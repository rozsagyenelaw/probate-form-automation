const { PDFDocument } = require('pdf-lib');

// Helper functions
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (!value) return "$0.00";
  const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// Fill DE-111 form with ACTUAL field names from the PDF
async function fillDE111(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    const fields = form.getFields();
    console.log(`DE-111 has ${fields.length} fields available`);
    
    // Map of actual field names to our data
    const fieldMappings = {
      // Page 1 - Attorney/Court Info (if these fields exist)
      'topmostSubform[0].Page1[0].TextField3g5[0]': `${data.attorney.name}, SBN ${data.attorney.bar_number}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}\nPhone: ${data.attorney.phone}\nEmail: ${data.attorney.email}\nAttorney for ${data.petitioner.name}`,
      
      // Page 2 - Estate values and other info
      'topmostSubform[0].Page2[0].Page2[0].FillText181[0]': data.estate.personal_property,
      'topmostSubform[0].Page2[0].Page2[0].FillText173[0]': data.estate.real_property_gross,
      'topmostSubform[0].Page2[0].Page2[0].FillText173[1]': data.estate.real_property_encumbrance,
      'topmostSubform[0].Page2[0].Page2[0].FillText162[0]': data.estate.real_property_net,
      'topmostSubform[0].Page2[0].Page2[0].FillText165[0]': data.estate.total,
      'topmostSubform[0].Page2[0].Page2[0].FillText164[0]': data.estate.will_date,
      'topmostSubform[0].Page2[0].Page2[0].FillText163[0]': data.decedent.death_place,
      'topmostSubform[0].Page2[0].Page2[0].FillText178[0]': data.decedent.death_date,
      'topmostSubform[0].Page2[0].Page2[0].FillText177[0]': data.decedent.death_address,
      'topmostSubform[0].Page2[0].Page2[0].FillText179[0]': data.administration.bond_amount,
      'topmostSubform[0].Page2[0].Page2[0].FillText182[0]': data.court.county,
      'topmostSubform[0].Page2[0].Page2[0].FillText183[0]': data.court.branch,
      
      // Case number and estate name on Page 2
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page2[0].Page2[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Page 3 - Case number and estate name
      'topmostSubform[0].Page3[0].PxCaption[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page3[0].PxCaption[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Page 4 - Petitioner information and signatures
      'topmostSubform[0].Page4[0].FillText357[0]': data.petitioner.name,
      'topmostSubform[0].Page4[0].FillText357[1]': data.petitioner.name, // Second petitioner field if needed
      'topmostSubform[0].Page4[0].FillText358[0]': data.petitioner.address,
      'topmostSubform[0].Page4[0].FillText276[0]': data.decedent.death_date,
      'topmostSubform[0].Page4[0].FillText276[1]': formatDate(new Date()), // Today's date
      'topmostSubform[0].Page4[0].FillText277[0]': data.petitioner.relationship,
      
      // Case number and estate name on Page 4
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]': 'To be assigned',
      'topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]': data.decedent.name,
      
      // Heirs list (if multiple heir fields exist)
      'topmostSubform[0].Page4[0].FillText350[0]': data.heirs[0]?.name || '',
      'topmostSubform[0].Page4[0].FillText351[0]': data.heirs[0]?.relationship || '',
      'topmostSubform[0].Page4[0].FillText352[0]': data.heirs[0]?.address || '',
    };
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        console.log(`Set field ${fieldName} to "${value}"`);
      } catch (e) {
        console.log(`Could not set text field ${fieldName}: ${e.message}`);
      }
    }
    
    // Handle checkboxes based on data
    const checkboxMappings = {
      // Page 1 checkboxes
      'topmostSubform[0].Page1[0].CheckBox81[0]': data.estate.has_will, // Has will checkbox
      
      // Page 2 checkboxes - set based on petition type
      'topmostSubform[0].Page2[0].Page2[0].CheckBox73[0]': data.estate.has_will, // Probate of will
      'topmostSubform[0].Page2[0].Page2[0].CheckBox74[0]': !data.estate.has_will, // Letters of administration
      'topmostSubform[0].Page2[0].Page2[0].CheckBox57[0]': data.decedent.is_resident, // Resident of county
      'topmostSubform[0].Page2[0].Page2[0].CheckBox58[0]': !data.decedent.is_resident, // Non-resident
      
      // Page 4 checkboxes
      'topmostSubform[0].Page4[0].CheckBox82[0]': true, // Publication requested
      'topmostSubform[0].Page4[0].CheckBox83[0]': false, // Publication to be arranged
    };
    
    // Check/uncheck checkboxes
    for (const [fieldName, shouldCheck] of Object.entries(checkboxMappings)) {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (shouldCheck) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        console.log(`${shouldCheck ? 'Checked' : 'Unchecked'} checkbox ${fieldName}`);
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
    
    // Fill all fields we can identify
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        
        // Fill based on field name patterns
        if (fieldName.includes('CaseNumber')) {
          textField.setText('To be assigned');
        } else if (fieldName.includes('Party') || fieldName.includes('TitleParty')) {
          textField.setText(data.decedent.name);
        } else if (fieldName.includes('Date')) {
          textField.setText(data.hearing.date);
        } else if (fieldName.includes('Time')) {
          textField.setText(data.hearing.time);
        } else if (fieldName.includes('Dept')) {
          textField.setText(data.hearing.dept);
        }
        
      } catch (e) {
        // Not a text field
      }
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
        } else if (fieldName.includes('Petitioner')) {
          textField.setText(data.petitioner.name);
        } else if (fieldName.includes('Bond')) {
          textField.setText(data.administration.bond_amount);
        }
        
      } catch (e) {
        // Not a text field
      }
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
        } else if (fieldName.includes('FillText357')) {
          textField.setText(data.petitioner.name);
        } else if (fieldName.includes('Address')) {
          textField.setText(data.petitioner.address);
        } else if (fieldName.includes('Phone')) {
          textField.setText(data.petitioner.phone);
        }
        
      } catch (e) {
        // Not a text field
      }
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
    
    // Transform the data
    const transformedData = transformQuestionnaireData(webhookData);
    
    console.log('Data transformed, filling PDFs...');
    
    // Generate the PDFs
    const pdfs = await fillProbateForms(transformedData);
    
    // Return base64 encoded PDFs
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
