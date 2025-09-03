const { PDFDocument } = require('pdf-lib');

// Field mappings with ACTUAL field names from the California court forms
const fieldMappings = {
  "DE-111": {
    // Based on the actual field names from pdftk dump
    "petitioner_name_1": "topmostSubform[0].Page4[0].FillText357[0]",
    "petitioner_name_2": "topmostSubform[0].Page4[0].FillText357[1]",
    "case_number": "topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]",
    "estate_name": "topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]",
    "date_field": "topmostSubform[0].Page4[0].FillText276[1]",
    
    // Checkboxes for petition type (these are checkbox fields)
    "checkbox_probate_will": "topmostSubform[0].Page4[0].CheckBox82[0]",
    
    // You'll need to map more fields based on the full dump
    // Run: pdftk DE-111.pdf dump_data_fields
    // to see all available fields
  },
  
  "DE-120": {
    // You need to run: pdftk DE-120.pdf dump_data_fields
    // to get the actual field names for this form
    // Placeholder fields for now
    "placeholder": "topmostSubform[0].Page1[0].TextField1[0]",
  },
  
  "DE-140": {
    // You need to run: pdftk DE-140.pdf dump_data_fields
    // to get the actual field names for this form
    // Placeholder fields for now
    "placeholder": "topmostSubform[0].Page1[0].TextField1[0]",
  },
  
  "DE-147": {
    // You need to run: pdftk DE-147.pdf dump_data_fields
    // to get the actual field names for this form
    // Placeholder fields for now
    "placeholder": "topmostSubform[0].Page1[0].TextField1[0]",
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
    
    // Get all fields to see what's available
    const fields = form.getFields();
    console.log(`DE-111 has ${fields.length} fields available`);
    
    // Log field names for debugging
    fields.forEach(field => {
      console.log(`Field: ${field.getName()}`);
    });
    
    // Fill the fields we know exist
    const fieldFillers = [
      { 
        fieldName: 'topmostSubform[0].Page4[0].FillText357[0]',
        value: data.petitioner.name,
        type: 'text'
      },
      { 
        fieldName: 'topmostSubform[0].Page4[0].CaptionPx_sf[0].CaseNumber[0].CaseNumber[0]',
        value: data.court.case_number || '',
        type: 'text'
      },
      { 
        fieldName: 'topmostSubform[0].Page4[0].CaptionPx_sf[0].TitlePartyName[0].Party1[0]',
        value: data.decedent.name,
        type: 'text'
      },
      { 
        fieldName: 'topmostSubform[0].Page4[0].FillText276[1]',
        value: data.decedent.death_date,
        type: 'text'
      },
    ];
    
    // Try to fill each field
    for (const { fieldName, value, type } of fieldFillers) {
      try {
        if (type === 'text') {
          const field = form.getTextField(fieldName);
          field.setText(value || '');
          console.log(`Set field ${fieldName} to "${value}"`);
        } else if (type === 'checkbox') {
          const field = form.getCheckBox(fieldName);
          if (value) field.check();
          console.log(`Checked field ${fieldName}`);
        }
      } catch (e) {
        console.log(`Could not set field ${fieldName}: ${e.message}`);
      }
    }
    
    // Try to fill fields by searching for partial matches
    // This is a fallback if exact field names don't work
    try {
      fields.forEach(field => {
        const fieldName = field.getName();
        
        // Match petitioner name fields
        if (fieldName.includes('FillText357')) {
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(data.petitioner.name);
            console.log(`Set ${fieldName} to petitioner name`);
          } catch (e) {}
        }
        
        // Match case number fields
        if (fieldName.includes('CaseNumber')) {
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(data.court.case_number || 'To be assigned');
            console.log(`Set ${fieldName} to case number`);
          } catch (e) {}
        }
        
        // Match estate/party name fields
        if (fieldName.includes('Party') || fieldName.includes('TitleParty')) {
          try {
            const textField = form.getTextField(fieldName);
            textField.setText(data.decedent.name);
            console.log(`Set ${fieldName} to decedent name`);
          } catch (e) {}
        }
      });
    } catch (e) {
      console.log('Error in fallback field filling:', e.message);
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
    
    // Log all field names to identify correct ones
    fields.forEach(field => {
      console.log(`DE-120 Field: ${field.getName()}`);
    });
    
    // Try to fill any text fields with relevant data
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        
        // Fill based on field name patterns
        if (fieldName.toLowerCase().includes('case')) {
          textField.setText(data.court.case_number || 'To be assigned');
        } else if (fieldName.toLowerCase().includes('estate') || fieldName.toLowerCase().includes('decedent')) {
          textField.setText(`Estate of ${data.decedent.name}, Decedent`);
        } else if (fieldName.toLowerCase().includes('date')) {
          textField.setText(data.hearing.date);
        } else if (fieldName.toLowerCase().includes('time')) {
          textField.setText(data.hearing.time);
        }
      } catch (e) {
        // Not a text field or error setting it
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
    
    // Log all field names
    fields.forEach(field => {
      console.log(`DE-140 Field: ${field.getName()}`);
    });
    
    // Try to fill fields based on patterns
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        
        if (fieldName.toLowerCase().includes('case')) {
          textField.setText(data.court.case_number || 'To be assigned');
        } else if (fieldName.toLowerCase().includes('estate') || fieldName.toLowerCase().includes('decedent')) {
          textField.setText(`Estate of ${data.decedent.name}, Decedent`);
        } else if (fieldName.toLowerCase().includes('petitioner') || fieldName.toLowerCase().includes('appointment')) {
          textField.setText(data.petitioner.name);
        } else if (fieldName.toLowerCase().includes('bond')) {
          textField.setText(data.administration.bond_amount);
        }
      } catch (e) {
        // Not a text field or error
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
    
    // Log all field names
    fields.forEach(field => {
      console.log(`DE-147 Field: ${field.getName()}`);
    });
    
    // Try to fill fields based on patterns
    fields.forEach(field => {
      const fieldName = field.getName();
      try {
        const textField = form.getTextField(fieldName);
        
        if (fieldName.toLowerCase().includes('case')) {
          textField.setText(data.court.case_number || 'To be assigned');
        } else if (fieldName.toLowerCase().includes('estate') || fieldName.toLowerCase().includes('decedent')) {
          textField.setText(`Estate of ${data.decedent.name}`);
        } else if (fieldName.toLowerCase().includes('petitioner') || fieldName.includes('FillText357')) {
          textField.setText(data.petitioner.name);
        } else if (fieldName.toLowerCase().includes('address')) {
          textField.setText(data.petitioner.address);
        } else if (fieldName.toLowerCase().includes('phone')) {
          textField.setText(data.petitioner.phone);
        }
      } catch (e) {
        // Not a text field or error
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
  
  // Process each form
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
