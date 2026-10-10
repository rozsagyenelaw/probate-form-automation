const { requireAdmin } = require('../lib/require-admin');
// netlify/functions/generate-de147.js
const { PDFDocument, rgb } = require('pdf-lib');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://probateformautomation.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Office only: a signed-in admin (Firebase ID token, checked server-side)
  const gate = await requireAdmin(event);
  if (!gate.ok) {
    return { statusCode: gate.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://probateformautomation.netlify.app' }, body: JSON.stringify({ error: gate.error }) };
  }

  try {
    const data = JSON.parse(event.body);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    page.drawText(`DE-147 Duties and Liabilities`, {
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

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        documentUrl: dataUrl,
        documentId: `DE147-${Date.now()}`,
        message: 'DE-147 generated successfully'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate document' })
    };
  }
};
