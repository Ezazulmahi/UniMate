const fs = require('fs/promises');
const path = require('path');

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv']);

// Pulls plain text out of an uploaded file so the study assistant can use it.
// Returns '' for formats we can't read (images, slides, and so on).
async function extractText(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return fs.readFile(filePath, 'utf8');
  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: await fs.readFile(filePath) });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy();
    }
  }
  return '';
}

module.exports = { extractText };
