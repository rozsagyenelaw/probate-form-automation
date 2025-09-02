const { fillProbateForms } = require('../../src/pdf-generator');
const { transformQuestionnaireData } = 
require('../../src/data-transformer');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Parse the Getform webhook data
    const webhookData = JSON.parse(event.body);
    
    console.log('Received webhook data:', webhookData);
    
    // Transform the data
    const transformedData = transformQuestionnaireData(webhookData);
    
    console.log('Transformed data:', transformedData);
    
    // Generate the PDFs
    const pdfs = await fillProbateForms(transformedData);
    
    // Return base64 encoded PDFs
    const response = {
      success: true,
      message: 'PDFs generated successfully',
      timestamp: new Date().toISOString(),
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
const 
{ 
fillProbateForms } = require('../../src/pdf-generator');
const { transformQuestionnaireData } = 
require('../../src/data-transformer');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Parse the Getform webhook data
    const webhookData = JSON.parse(event.body);
    
    console.log('Received webhook data:', webhookData);
    
    // Transform the data
    const transformedData = transformQuestionnaireData(webhookData);
    
    console.log('Transformed data:', transformedData);
    
    // Generate the PDFs
    const pdfs = await fillProbateForms(transformedData);
    
    // Return base64 encoded PDFs
    const response = {
      success: true,
      message: 'PDFs generated successfully',
      timestamp: new Date().toISOString(),
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

