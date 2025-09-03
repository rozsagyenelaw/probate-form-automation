const { PDFDocument } = require('pdf-lib');

// Field mappings for each form based on the actual California court forms
const fieldMappings = {
  "DE-111": {
    // Attorney/Firm Information
    "attorney_name": "topmostSubform[0].Page1[0].TextField1[0]",
    "attorney_bar": "topmostSubform[0].Page1[0].TextField1[1]",
    "firm_name": "topmostSubform[0].Page1[0].TextField1[2]",
    "firm_address": "topmostSubform[0].Page1[0].TextField1[3]",
    "firm_city": "topmostSubform[0].Page1[0].TextField1[4]",
    "firm_state": "topmostSubform[0].Page1[0].TextField1[5]",
    "firm_zip": "topmostSubform[0].Page1[0].TextField1[6]",
    "firm_phone": "topmostSubform[0].Page1[0].TextField1[7]",
    "firm_fax": "topmostSubform[0].Page1[0].TextField1[8]",
    "firm_email": "topmostSubform[0].Page1[0].TextField1[9]",
    "attorney_for": "topmostSubform[0].Page1[0].TextField1[10]",
    
    // Court Information
    "court_county": "topmostSubform[0].Page1[0].TextField2[0]",
    "court_street": "topmostSubform[0].Page1[0].TextField2[1]",
    "court_mailing": "topmostSubform[0].Page1[0].TextField2[2]",
    "court_city": "topmostSubform[0].Page1[0].TextField2[3]",
    "court_branch": "topmostSubform[0].Page1[0].TextField2[4]",
    
    // Estate Information
    "estate_of": "topmostSubform[0].Page1[0].TextField3[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField3[1]",
    
    // Death Information
    "death_date": "topmostSubform[0].Page1[0].TextField7[0]",
    "death_place": "topmostSubform[0].Page1[0].TextField7[1]",
    "death_address": "topmostSubform[0].Page1[0].TextField7[2]",
    
    // Petitioner
    "petitioner_name": "topmostSubform[0].Page1[0].TextField5[0]",
    
    // Estate Values
    "personal_property": "topmostSubform[0].Page2[0].TextField8[0]",
    "real_property_gross": "topmostSubform[0].Page2[0].TextField8[1]",
    "real_property_encumbrance": "topmostSubform[0].Page2[0].TextField8[2]",
    "real_property_net": "topmostSubform[0].Page2[0].TextField8[3]",
    "estate_total": "topmostSubform[0].Page2[0].TextField8[4]",
    
    // Will Information
    "will_date": "topmostSubform[0].Page2[0].TextField9[0]",
    "bond_amount": "topmostSubform[0].Page1[0].TextField6[0]",
  },
  
  "DE-120": {
    // Notice of Hearing form
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "court_info": "topmostSubform[0].Page1[0].TextField2[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField3[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField3[1]",
    "hearing_date": "topmostSubform[0].Page1[0].TextField4[0]",
    "hearing_time": "topmostSubform[0].Page1[0].TextField4[1]",
    "hearing_dept": "topmostSubform[0].Page1[0].TextField4[2]",
    "hearing_address": "topmostSubform[0].Page1[0].TextField4[3]",
  },
  
  "DE-140": {
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField2[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField3[0]",
    "appointment_name": "topmostSubform[0].Page1[0].TextField5[0]",
    "bond_amount": "topmostSubform[0].Page1[0].TextField6[0]",
  },
  
  "DE-147": {
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField2[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField3[0]",
    "petitioner_address": "topmostSubform[0].Page2[0].TextField4[0]",
    "petitioner_phone": "topmostSubform[0].Page2[0].TextField4[1]",
    "petitioner_name": "topmostSubform[0].Page2[0].TextField5[0]",
  }
};

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
    // For DE-120 Notice of Hearing - using placeholder date 30 days out
    hearing: {
      date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      time: "9:00 AM",
      dept: "11",
      room: "Room 312"
    }
  };
}

// FIXED: Load PDF from deployed Netlify site instead of GitHub
async function loadPDFFromRepo(filename) {
  const fetch = (await import('node-fetch')).default;
  // Changed to load from the deployed site
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

// Fill DE-111 form
async function fillDE111(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-111 has ${fields.length} fields available`);
    
    // Fill fields - wrapped in try-catch for each field
    const fieldFillers = [
      { field: 'attorney_name', value: `${data.attorney.name}, SBN ${data.attorney.bar_number}` },
      { field: 'firm_name', value: data.attorney.firm_name },
      { field: 'firm_address', value: data.attorney.street },
      { field: 'firm_city', value: data.attorney.city },
      { field: 'firm_state', value: data.attorney.state },
      { field: 'firm_zip', value: data.attorney.zip },
      { field: 'firm_phone', value: data.attorney.phone },
      { field: 'firm_email', value: data.attorney.email },
      { field: 'attorney_for', value: `PETITIONER, ${data.petitioner.name}` },
      { field: 'court_county', value: data.court.county },
      { field: 'court_street', value: data.court.street },
      { field: 'court_city', value: `${data.court.city} CA ${data.court.zip}` },
      { field: 'court_branch', value: data.court.branch },
      { field: 'estate_of', value: data.decedent.name },
      { field: 'petitioner_name', value: data.petitioner.name },
      { field: 'death_date', value: data.decedent.death_date },
      { field: 'death_place', value: data.decedent.death_place },
      { field: 'death_address', value: data.decedent.death_address },
      { field: 'personal_property', value: data.estate.personal_property },
      { field: 'real_property_gross', value: data.estate.real_property_gross },
      { field: 'real_property_encumbrance', value: data.estate.real_property_encumbrance },
      { field: 'real_property_net', value: data.estate.real_property_net },
      { field: 'estate_total', value: data.estate.total },
    ];
    
    for (const { field, value } of fieldFillers) {
      try {
        if (fieldMappings['DE-111'][field]) {
          const textField = form.getTextField(fieldMappings['DE-111'][field]);
          textField.setText(value);
        }
      } catch (e) {
        console.log(`Could not set field ${field} in DE-111`);
      }
    }
    
    if (data.estate.has_will) {
      try {
        const willDateField = form.getTextField(fieldMappings['DE-111'].will_date);
        willDateField.setText(data.estate.will_date);
      } catch (e) {}
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-111:', error);
    throw error;
  }
}

// Fill DE-120 form (Notice of Hearing)
async function fillDE120(data, pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`DE-120 has ${fields.length} fields available`);
    
    // Build attorney info string
    const attorneyInfo = `${data.attorney.name}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}\nPhone: ${data.attorney.phone}`;
    
    // Build court info string
    const courtInfo = `Superior Court of California\nCounty of ${data.court.county}\n${data.court.street}\n${data.court.city}, CA ${data.court.zip}`;
    
    const fieldFillers = [
      { field: 'attorney_info', value: attorneyInfo },
      { field: 'court_info', value: courtInfo },
      { field: 'estate_name', value: `Estate of ${data.decedent.name}, Decedent` },
      { field: 'case_number', value: data.court.case_number || 'To be assigned' },
      { field: 'hearing_date', value: data.hearing.date },
      { field: 'hearing_time', value: data.hearing.time },
      { field: 'hearing_dept', value: data.hearing.dept },
      { field: 'hearing_address', value: `${data.court.street}, ${data.hearing.room}` },
    ];
    
    for (const { field, value } of fieldFillers) {
      try {
        if (fieldMappings['DE-120'][field]) {
          const textField = form.getTextField(fieldMappings['DE-120'][field]);
          textField.setText(value);
        }
      } catch (e) {
        console.log(`Could not set field ${field} in DE-120`);
      }
    }
    
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
    
    const attorneyInfo = `${data.attorney.name}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`;
    
    const fieldFillers = [
      { field: 'attorney_info', value: attorneyInfo },
      { field: 'estate_name', value: `Estate of ${data.decedent.name}, Decedent` },
      { field: 'appointment_name', value: data.petitioner.name },
      { field: 'bond_amount', value: data.administration.bond_amount },
    ];
    
    for (const { field, value } of fieldFillers) {
      try {
        if (fieldMappings['DE-140'][field]) {
          const textField = form.getTextField(fieldMappings['DE-140'][field]);
          textField.setText(value);
        }
      } catch (e) {
        console.log(`Could not set field ${field} in DE-140`);
      }
    }
    
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
    
    const attorneyInfo = `${data.attorney.name}\n${data.attorney.firm_name}\n${data.attorney.street}\n${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`;
    
    const fieldFillers = [
      { field: 'attorney_info', value: attorneyInfo },
      { field: 'estate_name', value: `Estate of ${data.decedent.name}` },
      { field: 'petitioner_name', value: data.petitioner.name },
      { field: 'petitioner_address', value: data.petitioner.address },
      { field: 'petitioner_phone', value: data.petitioner.phone },
    ];
    
    for (const { field, value } of fieldFillers) {
      try {
        if (fieldMappings['DE-147'][field]) {
          const textField = form.getTextField(fieldMappings['DE-147'][field]);
          textField.setText(value);
        }
      } catch (e) {
        console.log(`Could not set field ${field} in DE-147`);
      }
    }
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling DE-147:', error);
    throw error;
  }
}

// Main function to fill all forms
async function fillProbateForms(data) {
  const results = {};
  
  // Process DE-111
  try {
    console.log('Processing DE-111...');
    const pdfBytes = await loadPDFFromRepo('DE-111.pdf');
    results['DE-111'] = await fillDE111(data, pdfBytes);
    console.log('DE-111 completed');
  } catch (error) {
    console.error('Error with DE-111:', error);
    results['DE-111'] = Buffer.from('Error processing DE-111');
  }
  
  // Process DE-120
  try {
    console.log('Processing DE-120...');
    const pdfBytes = await loadPDFFromRepo('DE-120.pdf');
    results['DE-120'] = await fillDE120(data, pdfBytes);
    console.log('DE-120 completed');
  } catch (error) {
    console.error('Error with DE-120:', error);
    results['DE-120'] = Buffer.from('Error processing DE-120');
  }
  
  // Process DE-140
  try {
    console.log('Processing DE-140...');
    const pdfBytes = await loadPDFFromRepo('DE-140.pdf');
    results['DE-140'] = await fillDE140(data, pdfBytes);
    console.log('DE-140 completed');
  } catch (error) {
    console.error('Error with DE-140:', error);
    results['DE-140'] = Buffer.from('Error processing DE-140');
  }
  
  // Process DE-147
  try {
    console.log('Processing DE-147...');
    const pdfBytes = await loadPDFFromRepo('DE-147.pdf');
    results['DE-147'] = await fillDE147(data, pdfBytes);
    console.log('DE-147 completed');
  } catch (error) {
    console.error('Error with DE-147:', error);
    results['DE-147'] = Buffer.from('Error processing DE-147');
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
