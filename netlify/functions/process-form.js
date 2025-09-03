const { PDFDocument } = require('pdf-lib');

// Field mappings based on the actual California court forms
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
    
    // Petition Type Checkboxes
    "petition_probate_will": "topmostSubform[0].Page1[0].CheckBox1[0]",
    "petition_probate_codicil": "topmostSubform[0].Page1[0].CheckBox1[1]",
    "petition_letters_admin": "topmostSubform[0].Page1[0].CheckBox1[2]",
    "petition_special_admin": "topmostSubform[0].Page1[0].CheckBox1[3]",
    "petition_authority_full": "topmostSubform[0].Page1[0].CheckBox1[4]",
    "petition_authority_limited": "topmostSubform[0].Page1[0].CheckBox1[5]",
    
    // Publication
    "publication_newspaper": "topmostSubform[0].Page1[0].TextField4[0]",
    "publication_requested": "topmostSubform[0].Page1[0].CheckBox2[0]",
    "publication_arranged": "topmostSubform[0].Page1[0].CheckBox2[1]",
    
    // Petitioner
    "petitioner_name": "topmostSubform[0].Page1[0].TextField5[0]",
    
    // Request details
    "will_admission": "topmostSubform[0].Page1[0].CheckBox3[0]",
    "appointment_executor": "topmostSubform[0].Page1[0].CheckBox3[1]",
    "appointment_admin_will": "topmostSubform[0].Page1[0].CheckBox3[2]",
    "appointment_admin": "topmostSubform[0].Page1[0].CheckBox3[3]",
    "appointment_special": "topmostSubform[0].Page1[0].CheckBox3[4]",
    "authority_full": "topmostSubform[0].Page1[0].CheckBox3[5]",
    "authority_limited": "topmostSubform[0].Page1[0].CheckBox3[6]",
    "bond_not_required": "topmostSubform[0].Page1[0].CheckBox3[7]",
    "bond_amount": "topmostSubform[0].Page1[0].TextField6[0]",
    
    // Death Information
    "death_date": "topmostSubform[0].Page1[0].TextField7[0]",
    "death_place": "topmostSubform[0].Page1[0].TextField7[1]",
    "death_resident": "topmostSubform[0].Page1[0].CheckBox4[0]",
    "death_nonresident": "topmostSubform[0].Page1[0].CheckBox4[1]",
    "death_address": "topmostSubform[0].Page1[0].TextField7[2]",
    
    // Estate Value (Page 2)
    "personal_property": "topmostSubform[0].Page2[0].TextField8[0]",
    "real_property_gross": "topmostSubform[0].Page2[0].TextField8[1]",
    "real_property_encumbrance": "topmostSubform[0].Page2[0].TextField8[2]",
    "real_property_net": "topmostSubform[0].Page2[0].TextField8[3]",
    "estate_total": "topmostSubform[0].Page2[0].TextField8[4]",
    
    // Will Information
    "will_date": "topmostSubform[0].Page2[0].TextField9[0]",
    "codicil_date": "topmostSubform[0].Page2[0].TextField9[1]",
    "will_self_proving": "topmostSubform[0].Page2[0].CheckBox5[0]",
    
    // Signatures
    "attorney_signature_date": "topmostSubform[0].Page4[0].DateField1[0]",
    "petitioner_signature_date": "topmostSubform[0].Page4[0].DateField1[1]",
  },
  
  "DE-140": {
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField2[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField3[0]",
    "hearing_date": "topmostSubform[0].Page1[0].TextField4[0]",
    "hearing_time": "topmostSubform[0].Page1[0].TextField4[1]",
    "hearing_dept": "topmostSubform[0].Page1[0].TextField4[2]",
    "judge_name": "topmostSubform[0].Page1[0].TextField4[3]",
    "appointment_name": "topmostSubform[0].Page1[0].TextField5[0]",
    "bond_amount": "topmostSubform[0].Page1[0].TextField6[0]",
  },
  
  "DE-147": {
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField2[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField3[0]",
    "petitioner_address": "topmostSubform[0].Page2[0].TextField4[0]",
    "petitioner_phone": "topmostSubform[0].Page2[0].TextField4[1]",
    "acknowledgment_date": "topmostSubform[0].Page2[0].DateField1[0]",
    "petitioner_name": "topmostSubform[0].Page2[0].TextField5[0]",
  },
  
  "DE-147S": {
    "pr_name": "topmostSubform[0].Page1[0].TextField1[0]",
    "pr_birthdate": "topmostSubform[0].Page1[0].TextField2[0]",
    "pr_license": "topmostSubform[0].Page1[0].TextField3[0]",
    "pr_license_state": "topmostSubform[0].Page1[0].TextField3[1]",
  },
  
  "DE-150": {
    "attorney_info": "topmostSubform[0].Page1[0].TextField1[0]",
    "estate_name": "topmostSubform[0].Page1[0].TextField2[0]",
    "case_number": "topmostSubform[0].Page1[0].TextField3[0]",
    "pr_name": "topmostSubform[0].Page1[0].TextField4[0]",
    "authority_full": "topmostSubform[0].Page1[0].CheckBox1[0]",
    "authority_limited": "topmostSubform[0].Page1[0].CheckBox1[1]",
    "execution_date": "topmostSubform[0].Page1[0].DateField1[0]",
    "execution_place": "topmostSubform[0].Page1[0].TextField5[0]",
  }
};

// URLs to download the blank forms from California Courts
const FORM_URLS = {
  'DE-111': 'https://www.courts.ca.gov/documents/de111.pdf',
  'DE-140': 'https://www.courts.ca.gov/documents/de140.pdf',
  'DE-147': 'https://www.courts.ca.gov/documents/de147.pdf',
  'DE-147S': 'https://www.courts.ca.gov/documents/de147s.pdf',
  'DE-150': 'https://www.courts.ca.gov/documents/de150.pdf'
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

// Transform webhook data to match PDF fields
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
    }
  };
}

// Download PDF from URL
async function downloadPDF(url) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error(`Error downloading from ${url}:`, error);
    throw error;
  }
}

// Fill DE-111 form
async function fillDE111(data, pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  
  try {
    // Attorney information
    const fields = form.getFields();
    console.log(`DE-111 has ${fields.length} fields`);
    
    // Try to fill using exact field names
    try {
      form.getTextField(fieldMappings['DE-111'].attorney_name).setText(
        `${data.attorney.name}, SBN ${data.attorney.bar_number}`
      );
    } catch (e) { console.log('Could not set attorney_name'); }
    
    try { form.getTextField(fieldMappings['DE-111'].firm_name).setText(data.attorney.firm_name); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_address).setText(data.attorney.street); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_city).setText(data.attorney.city); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_state).setText(data.attorney.state); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_zip).setText(data.attorney.zip); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_phone).setText(data.attorney.phone); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_fax).setText(data.attorney.fax); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].firm_email).setText(data.attorney.email); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].attorney_for).setText(`PETITIONER, ${data.petitioner.name}`); } catch (e) {}
    
    // Court information
    try { form.getTextField(fieldMappings['DE-111'].court_county).setText(data.court.county); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].court_street).setText(data.court.street); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].court_city).setText(`${data.court.city} CA ${data.court.zip}`); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].court_branch).setText(data.court.branch); } catch (e) {}
    
    // Estate information
    try { form.getTextField(fieldMappings['DE-111'].estate_of).setText(data.decedent.name); } catch (e) {}
    
    // Checkboxes for petition type
    if (data.estate.has_will) {
      try { form.getCheckBox(fieldMappings['DE-111'].petition_probate_will).check(); } catch (e) {}
      try { form.getCheckBox(fieldMappings['DE-111'].will_admission).check(); } catch (e) {}
      if (data.petitioner.is_executor) {
        try { form.getCheckBox(fieldMappings['DE-111'].appointment_executor).check(); } catch (e) {}
      } else {
        try { form.getCheckBox(fieldMappings['DE-111'].appointment_admin_will).check(); } catch (e) {}
      }
    } else {
      try { form.getCheckBox(fieldMappings['DE-111'].petition_letters_admin).check(); } catch (e) {}
      try { form.getCheckBox(fieldMappings['DE-111'].appointment_admin).check(); } catch (e) {}
    }
    
    // Authority level
    if (data.administration.type === 'full') {
      try { form.getCheckBox(fieldMappings['DE-111'].petition_authority_full).check(); } catch (e) {}
      try { form.getCheckBox(fieldMappings['DE-111'].authority_full).check(); } catch (e) {}
    } else {
      try { form.getCheckBox(fieldMappings['DE-111'].petition_authority_limited).check(); } catch (e) {}
      try { form.getCheckBox(fieldMappings['DE-111'].authority_limited).check(); } catch (e) {}
    }
    
    // Petitioner name
    try { form.getTextField(fieldMappings['DE-111'].petitioner_name).setText(data.petitioner.name); } catch (e) {}
    
    // Death information
    try { form.getTextField(fieldMappings['DE-111'].death_date).setText(data.decedent.death_date); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].death_place).setText(data.decedent.death_place); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].death_address).setText(data.decedent.death_address); } catch (e) {}
    
    if (data.decedent.is_resident) {
      try { form.getCheckBox(fieldMappings['DE-111'].death_resident).check(); } catch (e) {}
    } else {
      try { form.getCheckBox(fieldMappings['DE-111'].death_nonresident).check(); } catch (e) {}
    }
    
    // Estate values
    try { form.getTextField(fieldMappings['DE-111'].personal_property).setText(data.estate.personal_property); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].real_property_gross).setText(data.estate.real_property_gross); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].real_property_encumbrance).setText(data.estate.real_property_encumbrance); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].real_property_net).setText(data.estate.real_property_net); } catch (e) {}
    try { form.getTextField(fieldMappings['DE-111'].estate_total).setText(data.estate.total); } catch (e) {}
    
    // Will information
    if (data.estate.has_will) {
      try { form.getTextField(fieldMappings['DE-111'].will_date).setText(data.estate.will_date); } catch (e) {}
      if (data.estate.will_self_proving) {
        try { form.getCheckBox(fieldMappings['DE-111'].will_self_proving).check(); } catch (e) {}
      }
    }
    
    // Bond
    if (!data.administration.bond_required) {
      try { form.getCheckBox(fieldMappings['DE-111'].bond_not_required).check(); } catch (e) {}
    } else {
      try { form.getTextField(fieldMappings['DE-111'].bond_amount).setText(data.administration.bond_amount); } catch (e) {}
    }
    
  } catch (error) {
    console.error('Error filling DE-111:', error);
  }
  
  return await pdfDoc.save();
}

// Fill other forms (simplified for now)
async function fillDE140(data, pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // Similar implementation...
  return await pdfDoc.save();
}

async function fillDE147(data, pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // Similar implementation...
  return await pdfDoc.save();
}

async function fillDE147S(data, pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // Similar implementation...
  return await pdfDoc.save();
}

async function fillDE150(data, pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // Similar implementation...
  return await pdfDoc.save();
}

// Main function to fill all forms
async function fillProbateForms(data) {
  const results = {};
  
  // Download and fill DE-111
  try {
    console.log('Processing DE-111...');
    const pdfBytes = await downloadPDF(FORM_URLS['DE-111']);
    results['DE-111'] = await fillDE111(data, pdfBytes);
  } catch (error) {
    console.error('Error with DE-111:', error);
    results['DE-111'] = Buffer.from('Error processing DE-111');
  }
  
  // Download and fill DE-140
  try {
    console.log('Processing DE-140...');
    const pdfBytes = await downloadPDF(FORM_URLS['DE-140']);
    results['DE-140'] = await fillDE140(data, pdfBytes);
  } catch (error) {
    console.error('Error with DE-140:', error);
    results['DE-140'] = Buffer.from('Error processing DE-140');
  }
  
  // Download and fill DE-147
  try {
    console.log('Processing DE-147...');
    const pdfBytes = await downloadPDF(FORM_URLS['DE-147']);
    results['DE-147'] = await fillDE147(data, pdfBytes);
  } catch (error) {
    console.error('Error with DE-147:', error);
    results['DE-147'] = Buffer.from('Error processing DE-147');
  }
  
  // Download and fill DE-147S
  try {
    console.log('Processing DE-147S...');
    const pdfBytes = await downloadPDF(FORM_URLS['DE-147S']);
    results['DE-147S'] = await fillDE147S(data, pdfBytes);
  } catch (error) {
    console.error('Error with DE-147S:', error);
    results['DE-147S'] = Buffer.from('Error processing DE-147S');
  }
  
  // Download and fill DE-150
  try {
    console.log('Processing DE-150...');
    const pdfBytes = await downloadPDF(FORM_URLS['DE-150']);
    results['DE-150'] = await fillDE150(data, pdfBytes);
  } catch (error) {
    console.error('Error with DE-150:', error);
    results['DE-150'] = Buffer.from('Error processing DE-150');
  }
  
  return results;
}

// Netlify Function Handler
exports.handler = async (event, context) => {
  // Handle CORS
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
  
  // Only allow POST
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
    
    console.log('Transformed data, generating PDFs...');
    
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
        forms_generated: ['DE-111', 'DE-140', 'DE-147', 'DE-147S', 'DE-150']
      },
      pdfs: {
        'DE-111': Buffer.from(pdfs['DE-111']).toString('base64'),
        'DE-140': Buffer.from(pdfs['DE-140']).toString('base64'),
        'DE-147': Buffer.from(pdfs['DE-147']).toString('base64'),
        'DE-147S': Buffer.from(pdfs['DE-147S']).toString('base64'),
        'DE-150': Buffer.from(pdfs['DE-150']).toString('base64'),
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
