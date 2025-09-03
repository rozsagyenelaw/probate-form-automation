const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Data validation function
function validateWebhookData(data) {
  const requiredFields = [
    'decedent_name',
    'death_date',
    'death_place',
    'death_address',
    'death_resident',
    'petitioner_name',
    'petitioner_relationship',
    'petitioner_address',
    'petitioner_phone',
    'personal_property_value',
    'has_will',
    'heirs_list',
    'admin_type',
    'bond_required'
  ];
  
  const errors = [];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return data;
}

// Data transformation function
function transformQuestionnaireData(webhookData) {
  const validatedData = validateWebhookData(webhookData);
  
  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  function formatCurrency(value) {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  function parseHeirs(heirsList) {
    if (!heirsList) return [];
    if (typeof heirsList === 'string') {
      const separator = heirsList.includes('\n') ? '\n' : ';';
      return heirsList.split(separator).map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          name: parts[0] || '',
          relationship: parts[1] || '',
          age: parts[2] || '',
          address: parts[3] || '',
        };
      }).filter(heir => heir.name);
    }
    return Array.isArray(heirsList) ? heirsList : [];
  }
  
  const grossReal = parseFloat((validatedData.real_property_gross || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const encumbrance = parseFloat((validatedData.real_property_encumbrance || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const netReal = Math.max(0, grossReal - encumbrance);
  const personal = parseFloat((validatedData.personal_property_value || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  
  const courtInfo = getCourtAddress(validatedData.court_county || 'LOS ANGELES');
  
  return {
    attorney: {
      name: validatedData.attorney_name || "ROZSA GYENE, ESQ.",
      bar_number: validatedData.attorney_bar || "208356",
      firm_name: validatedData.firm_name || "LAW OFFICES OF ROZSA GYENE",
      street: validatedData.firm_street || "450 N BRAND BLVD SUITE 600",
      city: validatedData.firm_city || "GLENDALE",
      state: validatedData.firm_state || "CA",
      zip: validatedData.firm_zip || "91203",
      phone: validatedData.firm_phone || "818-291-6217",
      fax: validatedData.firm_fax || "818-291-6205",
      email: validatedData.firm_email || "ROZSAGYENELAW@YAHOO.COM",
    },
    decedent: {
      name: validatedData.decedent_name,
      death_date: formatDate(validatedData.death_date),
      death_place: validatedData.death_place,
      death_address: validatedData.death_address,
      is_resident: validatedData.death_resident === "yes",
    },
    petitioner: {
      name: validatedData.petitioner_name,
      relationship: validatedData.petitioner_relationship,
      address: validatedData.petitioner_address,
      phone: validatedData.petitioner_phone,
      is_executor: validatedData.petitioner_is_executor === "yes",
    },
    estate: {
      personal_property: formatCurrency(personal),
      real_property_gross: formatCurrency(grossReal),
      real_property_encumbrance: formatCurrency(encumbrance),
      real_property_net: formatCurrency(netReal),
      total: formatCurrency(personal + netReal),
      has_will: validatedData.has_will === "yes",
      will_date: formatDate(validatedData.will_date),
      will_self_proving: validatedData.will_self_proving === "yes",
    },
    heirs: parseHeirs(validatedData.heirs_list),
    administration: {
      type: validatedData.admin_type,
      bond_required: validatedData.bond_required === "yes",
      bond_amount: formatCurrency(validatedData.bond_amount),
    },
    court: {
      county: validatedData.court_county || "LOS ANGELES",
      branch: validatedData.court_branch || "CENTRAL",
      street: courtInfo.street,
      city: courtInfo.city,
      zip: courtInfo.zip,
    }
  };
}

function getCourtAddress(county) {
  const courtAddresses = {
    'LOS ANGELES': {
      street: '111 N HILL ST',
      city: 'LOS ANGELES',
      zip: '90012'
    },
    'ORANGE': {
      street: '341 THE CITY DRIVE',
      city: 'ORANGE',
      zip: '92868'
    },
    'SAN DIEGO': {
      street: '1409 4TH AVENUE',
      city: 'SAN DIEGO',
      zip: '92101'
    },
    'VENTURA': {
      street: '800 S VICTORIA AVE',
      city: 'VENTURA',
      zip: '93009'
    },
    'RIVERSIDE': {
      street: '4050 MAIN ST',
      city: 'RIVERSIDE',
      zip: '92501'
    }
  };
  
  return courtAddresses[county] || courtAddresses['LOS ANGELES'];
}

// PDF Generation Functions
async function fillProbateForms(data) {
  const results = {};
  
  try {
    results['DE-111'] = await fillDE111(data);
    results['DE-140'] = await fillDE140(data);
    results['DE-147'] = await fillDE147(data);
    results['DE-147S'] = await fillDE147S(data);
    results['DE-150'] = await fillDE150(data);
    
    return results;
  } catch (error) {
    console.error('Error generating PDFs:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

async function fillDE111(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  
  // Title
  page.drawText('PETITION FOR PROBATE (DE-111)', {
    x: 150,
    y: 750,
    size: 14,
    font: boldFont,
  });
  
  // Attorney Information
  let yPos = 700;
  page.drawText('ATTORNEY OR PARTY WITHOUT ATTORNEY:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 20;
  page.drawText(`Name: ${data.attorney.name}, SBN ${data.attorney.bar_number}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Firm: ${data.attorney.firm_name}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Address: ${data.attorney.street}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`${data.attorney.city}, ${data.attorney.state} ${data.attorney.zip}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Phone: ${data.attorney.phone}  Fax: ${data.attorney.fax}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Email: ${data.attorney.email}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Attorney for: Petitioner, ${data.petitioner.name}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  // Court Information
  yPos -= 30;
  page.drawText('SUPERIOR COURT OF CALIFORNIA', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 15;
  page.drawText(`County of ${data.court.county}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`${data.court.street}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`${data.court.city}, CA ${data.court.zip}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Branch: ${data.court.branch}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  // Estate Information
  yPos -= 30;
  page.drawText('ESTATE OF:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 15;
  page.drawText(data.decedent.name.toUpperCase(), {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 15;
  page.drawText('DECEDENT', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  // Petition Type
  yPos -= 30;
  page.drawText('PETITION FOR:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 15;
  const petitionType = data.estate.has_will ? 
    '[X] Probate of Will and for Letters Testamentary' : 
    '[X] Letters of Administration';
  page.drawText(petitionType, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  const authorityType = data.administration.type === 'full' ?
    '[X] Authorization to Administer Under the Independent Administration of Estates Act' :
    '[X] Limited Authority';
  page.drawText(authorityType, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  // Death Information
  yPos -= 30;
  page.drawText('1. Decedent Information:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 15;
  page.drawText(`Date of Death: ${data.decedent.death_date}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Place of Death: ${data.decedent.death_place}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  const residency = data.decedent.is_resident ? 
    'Resident of California' : 
    'Non-resident of California';
  page.drawText(`Residency: ${residency}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Address at Death: ${data.decedent.death_address}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  // Estate Value
  yPos -= 30;
  page.drawText('2. Estate Value:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 15;
  page.drawText(`Personal Property: ${data.estate.personal_property}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Real Property (Gross): ${data.estate.real_property_gross}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Less Encumbrances: ${data.estate.real_property_encumbrance}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Real Property (Net): ${data.estate.real_property_net}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`TOTAL ESTATE VALUE: ${data.estate.total}`, {
    x: 70,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  // Add second page for heirs if needed
  if (data.heirs && data.heirs.length > 0) {
    const page2 = pdfDoc.addPage([612, 792]);
    yPos = 750;
    
    page2.drawText('HEIRS AND BENEFICIARIES:', {
      x: 50,
      y: yPos,
      size: 10,
      font: boldFont,
    });
    
    yPos -= 20;
    data.heirs.forEach((heir, index) => {
      if (yPos < 100) {
        const newPage = pdfDoc.addPage([612, 792]);
        yPos = 750;
      }
      
      page2.drawText(`${index + 1}. ${heir.name}`, {
        x: 70,
        y: yPos,
        size: 10,
        font: font,
      });
      
      yPos -= 15;
      page2.drawText(`   Relationship: ${heir.relationship}`, {
        x: 70,
        y: yPos,
        size: 9,
        font: font,
      });
      
      if (heir.age) {
        yPos -= 15;
        page2.drawText(`   Age: ${heir.age}`, {
          x: 70,
          y: yPos,
          size: 9,
          font: font,
        });
      }
      
      if (heir.address) {
        yPos -= 15;
        page2.drawText(`   Address: ${heir.address}`, {
          x: 70,
          y: yPos,
          size: 9,
          font: font,
        });
      }
      
      yPos -= 20;
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE140(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  
  page.drawText('ORDER FOR PROBATE (DE-140)', {
    x: 180,
    y: 750,
    size: 14,
    font: boldFont,
  });
  
  let yPos = 700;
  page.drawText('ORDER APPOINTING:', {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 20;
  const appointmentType = data.petitioner.is_executor ? 'Executor' : 'Administrator';
  page.drawText(`${data.petitioner.name} as ${appointmentType}`, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 30;
  page.drawText('Estate of: ' + data.decedent.name.toUpperCase(), {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 30;
  page.drawText('Authority Granted:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 20;
  const authority = data.administration.type === 'full' ? 
    'Full Authority under the Independent Administration of Estates Act' :
    'Limited Authority';
  page.drawText(authority, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  if (data.administration.bond_required) {
    yPos -= 30;
    page.drawText(`Bond Required: ${data.administration.bond_amount}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
    });
  } else {
    yPos -= 30;
    page.drawText('Bond: Waived', {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE147(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  
  page.drawText('DUTIES AND LIABILITIES OF PERSONAL REPRESENTATIVE (DE-147)', {
    x: 100,
    y: 750,
    size: 12,
    font: boldFont,
  });
  
  let yPos = 700;
  page.drawText('ACKNOWLEDGMENT OF RECEIPT', {
    x: 200,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 40;
  page.drawText(`I, ${data.petitioner.name}, acknowledge that I have received a copy`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText('of the Duties and Liabilities of Personal Representative.', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 30;
  page.drawText(`Estate of: ${data.decedent.name}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 30;
  page.drawText('Contact Information:', {
    x: 50,
    y: yPos,
    size: 10,
    font: boldFont,
  });
  
  yPos -= 20;
  page.drawText(`Address: ${data.petitioner.address}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 15;
  page.drawText(`Phone: ${data.petitioner.phone}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE147S(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  
  page.drawText('CONFIDENTIAL SUPPLEMENT (DE-147S)', {
    x: 150,
    y: 750,
    size: 14,
    font: boldFont,
  });
  
  page.drawText('** CONFIDENTIAL **', {
    x: 230,
    y: 720,
    size: 12,
    font: boldFont,
    color: rgb(1, 0, 0),
  });
  
  let yPos = 680;
  page.drawText('Personal Representative Information:', {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 30;
  page.drawText(`Name: ${data.petitioner.name}`, {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 20;
  page.drawText('Date of Birth: [To be provided]', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 20;
  page.drawText('Driver License #: [To be provided]', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE150(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  
  const lettersType = data.estate.has_will ? 'LETTERS TESTAMENTARY' : 'LETTERS OF ADMINISTRATION';
  
  page.drawText(lettersType + ' (DE-150)', {
    x: 200,
    y: 750,
    size: 14,
    font: boldFont,
  });
  
  let yPos = 680;
  page.drawText('The court hereby appoints:', {
    x: 50,
    y: yPos,
    size: 11,
    font: font,
  });
  
  yPos -= 30;
  page.drawText(data.petitioner.name, {
    x: 150,
    y: yPos,
    size: 12,
    font: boldFont,
  });
  
  yPos -= 30;
  const role = data.petitioner.is_executor ? 'Executor' : 'Administrator';
  page.drawText(`as ${role} of the Estate of:`, {
    x: 50,
    y: yPos,
    size: 11,
    font: font,
  });
  
  yPos -= 30;
  page.drawText(data.decedent.name.toUpperCase(), {
    x: 150,
    y: yPos,
    size: 12,
    font: boldFont,
  });
  
  yPos -= 30;
  page.drawText('DECEASED', {
    x: 150,
    y: yPos,
    size: 10,
    font: font,
  });
  
  yPos -= 40;
  page.drawText('Authority:', {
    x: 50,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  
  yPos -= 20;
  const authorityText = data.administration.type === 'full' ?
    '[X] Full Authority under the Independent Administration of Estates Act' :
    '[X] Limited Authority as specified in the Order for Probate';
  page.drawText(authorityText, {
    x: 70,
    y: yPos,
    size: 10,
    font: font,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Main Netlify Function Handler
exports.handler = async (event, context) => {
  // Handle CORS preflight
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
  
  // Only allow POST requests
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
    // Parse the webhook data
    const webhookData = JSON.parse(event.body);
    
    console.log('Received webhook data:', {
      timestamp: new Date().toISOString(),
      fields_count: Object.keys(webhookData).length,
      has_decedent: !!webhookData.decedent_name,
      has_petitioner: !!webhookData.petitioner_name
    });
    
    // Transform and validate the data
    const transformedData = transformQuestionnaireData(webhookData);
    
    console.log('Data transformation successful:', {
      estate_total: transformedData.estate.total,
      heirs_count: transformedData.heirs.length,
      has_will: transformedData.estate.has_will
    });
    
    // Generate the PDFs
    const pdfs = await fillProbateForms(transformedData);
    
    // Prepare response
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
    
    console.log('PDFs generated successfully');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('Error processing form:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Failed to process form',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
