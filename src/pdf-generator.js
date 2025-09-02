const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const fieldMappings = require('./mappings/field-mappings.json');
const { formatCurrency } = require('./data-transformer');

async function fillProbateForms(data) {
  const results = {};
  
  results['DE-111'] = await fillDE111(data);
  results['DE-140'] = await fillDE140(data);
  results['DE-147'] = await fillDE147(data);
  results['DE-147S'] = await fillDE147S(data);
  results['DE-150'] = await fillDE150(data);
  
  return results;
}

async function fillDE111(data) {
  const templatePath = path.join(__dirname, 
'../templates/DE-111-blank.pdf');
  const existingPdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  
  // Fill attorney information
  form.getTextField(fieldMappings['DE-111'].attorney_name).setText(
    `${data.attorney.name}, SBN ${data.attorney.bar_number}`
  );
  
form.getTextField(fieldMappings['DE-111'].firm_name).setText(data.attorney.firm_name);
  
form.getTextField(fieldMappings['DE-111'].firm_address).setText(data.attorney.street);
  
form.getTextField(fieldMappings['DE-111'].firm_city).setText(data.attorney.city);
  
form.getTextField(fieldMappings['DE-111'].firm_state).setText(data.attorney.state);
  
form.getTextField(fieldMappings['DE-111'].firm_zip).setText(data.attorney.zip);
  
form.getTextField(fieldMappings['DE-111'].firm_phone).setText(data.attorney.phone);
  
form.getTextField(fieldMappings['DE-111'].firm_fax).setText(data.attorney.fax);
  
form.getTextField(fieldMappings['DE-111'].firm_email).setText(data.attorney.email);
  
form.getTextField(fieldMappings['DE-111'].attorney_for).setText(`PETITIONER, 
${data.petitioner.name}`);
  
  // Fill court information
  
form.getTextField(fieldMappings['DE-111'].court_county).setText(data.court.county);
  
form.getTextField(fieldMappings['DE-111'].court_street).setText(data.court.street);
  
form.getTextField(fieldMappings['DE-111'].court_city).setText(`${data.court.city} 
CA ${data.court.zip}`);
  
form.getTextField(fieldMappings['DE-111'].court_branch).setText(data.court.branch);
  
  // Fill estate information
  
form.getTextField(fieldMappings['DE-111'].estate_of).setText(data.decedent.name);
  
  // Check appropriate petition type boxes
  if (data.estate.has_will) {
    
form.getCheckBox(fieldMappings['DE-111'].petition_probate_will).check();
    form.getCheckBox(fieldMappings['DE-111'].will_admission).check();
    if (data.petitioner.is_executor) {
      
form.getCheckBox(fieldMappings['DE-111'].appointment_executor).check();
    } else {
      
form.getCheckBox(fieldMappings['DE-111'].appointment_admin_will).check();
    }
  } else {
    
form.getCheckBox(fieldMappings['DE-111'].petition_letters_admin).check();
    form.getCheckBox(fieldMappings['DE-111'].appointment_admin).check();
  }
  
  // Set authority level
  if (data.administration.type === 'full') {
    
form.getCheckBox(fieldMappings['DE-111'].petition_authority_full).check();
    form.getCheckBox(fieldMappings['DE-111'].authority_full).check();
  } else {
    
form.getCheckBox(fieldMappings['DE-111'].petition_authority_limited).check();
    form.getCheckBox(fieldMappings['DE-111'].authority_limited).check();
  }
  
  // Fill publication information
  
form.getTextField(fieldMappings['DE-111'].publication_newspaper).setText("DAILY 
JOURNAL");
  form.getCheckBox(fieldMappings['DE-111'].publication_arranged).check();
  
  // Fill petitioner name
  
form.getTextField(fieldMappings['DE-111'].petitioner_name).setText(data.petitioner.name);
  
  // Fill death information
  
form.getTextField(fieldMappings['DE-111'].death_date).setText(data.decedent.death_date);
  
form.getTextField(fieldMappings['DE-111'].death_place).setText(data.decedent.death_place);
  
form.getTextField(fieldMappings['DE-111'].death_address).setText(data.decedent.death_address);
  
  if (data.decedent.is_resident) {
    form.getCheckBox(fieldMappings['DE-111'].death_resident).check();
  } else {
    form.getCheckBox(fieldMappings['DE-111'].death_nonresident).check();
  }
  
  // Fill estate values
  
form.getTextField(fieldMappings['DE-111'].personal_property).setText(data.estate.personal_property);
  
form.getTextField(fieldMappings['DE-111'].real_property_gross).setText(data.estate.real_property_gross 
|| "$0");
  
form.getTextField(fieldMappings['DE-111'].real_property_encumbrance).setText(data.estate.real_property_encumbrance 
|| "$0");
  
form.getTextField(fieldMappings['DE-111'].real_property_net).setText(data.estate.real_property_net 
|| "$0");
  
  // Calculate and set total
  const personal = 
parseFloat(data.estate.personal_property.replace(/[^0-9.-]/g, '')) || 0;
  const realNet = parseFloat((data.estate.real_property_net || 
"$0").replace(/[^0-9.-]/g, '')) || 0;
  const total = personal + realNet;
  
form.getTextField(fieldMappings['DE-111'].estate_total).setText(formatCurrency(total));
  
  // Fill will information if applicable
  if (data.estate.has_will) {
    
form.getTextField(fieldMappings['DE-111'].will_date).setText(data.estate.will_date);
    if (data.estate.will_self_proving) {
      form.getCheckBox(fieldMappings['DE-111'].will_self_proving).check();
    }
  }
  
  // Bond information
  if (!data.administration.bond_required) {
    form.getCheckBox(fieldMappings['DE-111'].bond_not_required).check();
  } else {
    
form.getTextField(fieldMappings['DE-111'].bond_amount).setText(data.administration.bond_amount);
  }
  
  // Fill heirs table (Page 4)
  const pages = pdfDoc.getPages();
  const page4 = pages[3];
  let yPosition = 650;
  
  data.heirs.forEach((heir, index) => {
    if (yPosition > 100) {
      page4.drawText(`${heir.name}, ${heir.relationship}`, {
        x: 50,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      
      if (heir.age) {
        page4.drawText(heir.age, {
          x: 300,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }
      
      if (heir.address) {
        page4.drawText(heir.address, {
          x: 350,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }
      
      yPosition -= 20;
    }
  });
  
  // Add signature dates
  const currentDate = new Date().toLocaleDateString('en-US');
  
form.getTextField(fieldMappings['DE-111'].attorney_signature_date).setText(currentDate);
  
form.getTextField(fieldMappings['DE-111'].petitioner_signature_date).setText(currentDate);
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE140(data) {
  const templatePath = path.join(__dirname, 
'../templates/DE-140-blank.pdf');
  const existingPdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  
  // Fill basic information
  form.getTextField(fieldMappings['DE-140'].attorney_info).setText(
    `${data.attorney.name}, SBN ${data.attorney.bar_number}`
  );
  
form.getTextField(fieldMappings['DE-140'].estate_name).setText(data.decedent.name);
  
form.getTextField(fieldMappings['DE-140'].appointment_name).setText(data.petitioner.name);
  
  // Set bond amount if required
  if (data.administration.bond_required) {
    
form.getTextField(fieldMappings['DE-140'].bond_amount).setText(data.administration.bond_amount);
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE147(data) {
  const templatePath = path.join(__dirname, 
'../templates/DE-147-blank.pdf');
  const existingPdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  
  // Fill attorney and estate information
  form.getTextField(fieldMappings['DE-147'].attorney_info).setText(
    `${data.attorney.name}, SBN ${data.attorney.bar_number}`
  );
  
form.getTextField(fieldMappings['DE-147'].estate_name).setText(data.decedent.name);
  
form.getTextField(fieldMappings['DE-147'].petitioner_name).setText(data.petitioner.name);
  
form.getTextField(fieldMappings['DE-147'].petitioner_address).setText(data.petitioner.address);
  
form.getTextField(fieldMappings['DE-147'].petitioner_phone).setText(data.petitioner.phone);
  
  // Set acknowledgment date
  const currentDate = new Date().toLocaleDateString('en-US');
  
form.getTextField(fieldMappings['DE-147'].acknowledgment_date).setText(currentDate);
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE147S(data) {
  const templatePath = path.join(__dirname, 
'../templates/DE-147S-blank.pdf');
  const existingPdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  
  // Fill personal representative confidential information
  
form.getTextField(fieldMappings['DE-147S'].pr_name).setText(data.petitioner.name);
  // Additional fields would be filled if provided in the data
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function fillDE150(data) {
  const templatePath = path.join(__dirname, 
'../templates/DE-150-blank.pdf');
  const existingPdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  
  // Fill attorney and estate information
  form.getTextField(fieldMappings['DE-150'].attorney_info).setText(
    `${data.attorney.name}, SBN ${data.attorney.bar_number}`
  );
  
form.getTextField(fieldMappings['DE-150'].estate_name).setText(data.decedent.name);
  
form.getTextField(fieldMappings['DE-150'].pr_name).setText(data.petitioner.name);
  
  // Set authority level
  if (data.administration.type === 'full') {
    form.getCheckBox(fieldMappings['DE-150'].authority_full).check();
  } else {
    form.getCheckBox(fieldMappings['DE-150'].authority_limited).check();
  }
  
  // Set execution date and place
  const currentDate = new Date().toLocaleDateString('en-US');
  
form.getTextField(fieldMappings['DE-150'].execution_date).setText(currentDate);
  
form.getTextField(fieldMappings['DE-150'].execution_place).setText(`${data.court.city}, 
CA`);
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = {
  fillProbateForms,
  fillDE111,
  fillDE140,
  fillDE147,
  fillDE147S,
  fillDE150
};

