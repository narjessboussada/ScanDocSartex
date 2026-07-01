const Tesseract = require('tesseract.js');

const ocrService = {
  async analyze(imageBase64) {
    try {
      console.log('[OCR] Analyse en cours...');

      const result = await Tesseract.recognize(imageBase64, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progression : ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const rawText = result.data.text.trim();
      console.log('[OCR] Texte extrait :\n', rawText);

      const fields = extractFields(rawText);
      console.log('[OCR] Champs extraits :', fields);

      return { rawText, fields };

    } catch (err) {
      console.error('[OCR] Erreur :', err.message);
      const error = new Error('OCR failed to read the document');
      error.statusCode = 422;
      throw error;
    }
  },
};

function extractFields(text) {
  const fields = [];

  const patterns = [
    // Numéro de facture — cherche le plus grand nombre après "facture/invoice/N°"
    { name: 'invoice_number', regex: /(?:facture\s*n[o°]?\.?\s*|invoice\s*n[o°]?\.?\s*|n[o°]\s*:?\s*)(\d+)/i },
    // Date de facturation
    { name: 'date_facturation', regex: /(?:date\s*(?:de\s*)?facturation\s*:?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i },
    // Échéance
    { name: 'date_echeance', regex: /(?:échéance\s*:?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i },
    // Total HT — cherche "Total:" suivi d'un montant (avant TVA)
    { name: 'total_ht', regex: /total\s*:?\s*([\d\s]+[,\.]\d{2})\s*€?(?!\s*TTC)/i },
    // TVA — cherche "TVA(xx%):"
    { name: 'tva', regex: /tva\s*\(?\d+%?\)?\s*:?\s*([\d\s]+[,\.]\d{2})\s*€?/i },
    // Total TTC — cherche "Total TTC:"
    { name: 'total_ttc', regex: /total\s+ttc\s*:?\s*([\d\s]+[,\.]\d{2})\s*€?/i },
    // Email
    { name: 'email', regex: /[\w.-]+@[\w.-]+\.\w+/i },
    // Téléphone
    { name: 'phone', regex: /(?:tél?\.?\s*:?\s*)?(\+?\d[\d\s\-\.]{7,})/i },
    // IBAN
    { name: 'iban', regex: /[A-Z]{2}\d{2}[\s\d]{10,}/i },
    // SIRET
    { name: 'siret', regex: /siret\s*:?\s*([\d\s]{9,})/i },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      fields.push({
        name : pattern.name,
        value: (match[1] || match[0]).trim(),
      });
    }
  }

  // Lignes avec ":" comme champs supplémentaires
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const existingNames = fields.map(f => f.name);

  lines.forEach((line) => {
    if (line.includes(':') && !line.startsWith('[')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const name  = key.trim().toLowerCase().replace(/\s+/g, '_');

      // Évite les doublons et les valeurs vides
      if (key && value && value.length > 1 && !existingNames.includes(name)) {
        fields.push({ name, value });
        existingNames.push(name);
      }
    }
  });

  return fields;
}

module.exports = ocrService;