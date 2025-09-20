// netlify/functions/generate-de111.js
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    console.log('Received data for DE-111:', data);

    // For now, we'll create a simple PDF
    // Later, you'll replace this with your actual form filling logic
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    // Add some text to verify it's working
    page.drawText(`DE-111 Petition for Probate`, {
      x: 50,
      y: height - 100,
      size: 20,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Client: ${data.clientInfo?.name || 'Unknown'}`, {
      x: 50,
      y: height - 150,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Case Number: ${data.clientInfo?.caseNumber || 'Not Assigned'}`, {
      x: 50,
      y: height - 180,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 210,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 for returning
    const base64 = Buffer.from(pdfBytes).toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        documentUrl: dataUrl,
        documentId: `DE111-${Date.now()}`,
        message: 'DE-111 generated successfully'
      })
    };
  } catch (error) {
    console.error('Error generating DE-111:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate document',
        details: error.message 
      })
    };
  }
};
