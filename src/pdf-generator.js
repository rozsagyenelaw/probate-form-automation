const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function fillProbateForms(data) {
  // Minimal implementation for testing
  return {
    'DE-111': Buffer.from('test pdf content'),
    'DE-140': Buffer.from('test pdf content'),
    'DE-147': Buffer.from('test pdf content'),
    'DE-147S': Buffer.from('test pdf content'),
    'DE-150': Buffer.from('test pdf content'),
  };
}

module.exports = {
  fillProbateForms
};
