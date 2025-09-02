# California Probate Forms Automation System

## Overview
This system automates the generation of California probate court forms 
(DE-111, DE-140, DE-147, DE-147S, DE-150) by receiving data from Getform 
webhooks and filling PDF templates.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Add PDF Templates
Download the blank California probate forms and place them in the 
`templates/` directory:
- DE-111-blank.pdf (Petition for Probate)
- DE-140-blank.pdf (Order for Probate)
- DE-147-blank.pdf (Duties and Liabilities)
- DE-147S-blank.pdf (Confidential Supplement)
- DE-150-blank.pdf (Letters)

You can download these from: https://www.courts.ca.gov/forms.htm

### 3. Deploy to Netlify
```bash
# Using Netlify CLI
netlify deploy --prod

# Or connect your GitHub repository to Netlify
```

### 4. Configure Getform Webhook
1. Log into your Getform dashboard
2. Go to your form settings
3. Add webhook endpoint: 
`https://your-site.netlify.app/.netlify/functions/process-form`

## API Endpoint

**POST** `/.netlify/functions/process-form`

### Request Body (from Getform)
```json
{
  "decedent_name": "John Doe",
  "death_date": "2024-01-15",
  "death_place": "Los Angeles, CA",
  "petitioner_name": "Jane Doe",
  "petitioner_relationship": "Spouse",
  "personal_property_value": "50000",
  "has_will": "yes",
  "admin_type": "full"
}
```

### Response
```json
{
  "success": true,
  "message": "PDFs generated successfully",
  "pdfs": {
    "DE-111": "base64_encoded_pdf_content",
    "DE-140": "base64_encoded_pdf_content",
    "DE-147": "base64_encoded_pdf_content",
    "DE-147S": "base64_encoded_pdf_content",
    "DE-150": "base64_encoded_pdf_content"
  }
}
```

## Testing

### Local Testing
```bash
# Run Netlify dev server
netlify dev

# Test with curl
curl -X POST http://localhost:8888/.netlify/functions/process-form \
  -H "Content-Type: application/json" \
  -d '{"decedent_name":"Test Name","petitioner_name":"Test Petitioner"}'
```

## Project Structure
```
probate-form-automation/
├── netlify/
│   └── functions/
│       └── process-form.js       # Webhook handler
├── src/
│   ├── mappings/
│   │   └── field-mappings.json   # PDF field mappings
│   ├── data-transformer.js       # Data transformation logic
│   └── pdf-generator.js          # PDF filling logic
├── templates/                     # PDF templates (not in git)
├── netlify.toml                   # Netlify configuration
├── package.json                   # Dependencies
└── README.md                      # Documentation
```

## License
Private - Law Offices of Rozsa Gyene

## Support
For issues or questions, contact: rozsagyenelaw@yahoo.com
# 
California Probate Forms 
Automation 
System
