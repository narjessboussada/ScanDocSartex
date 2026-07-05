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
      const confidence = Math.round(result.data.confidence);
      const niveau = confidence >= 80 ? 'bon' : confidence >= 60 ? 'moyen' : 'faible';
      console.log(`[OCR] Qualité : ${niveau} (${confidence}%)`);
      console.log('[OCR] Texte extrait :\n', rawText);

      const fields = extractFields(rawText);
      console.log(`[OCR] ${fields.length} champs extraits`);

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
  const added  = new Set();

  const add = (name, value) => {
    const v = (value || '').toString().trim();
    if (v.length > 0 && !added.has(name)) {
      fields.push({ name, value: v });
      added.add(name);
    }
  };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // ── 1. Fournisseur ──
  // Cherche une ligne avec SARL, SA, SUARL, etc.
  const companyLine = lines.find(l =>
    /\b(SARL|SA|SUARL|SPA|GIE|ETS|SOCIETE|ENTREPRISE)\b/i.test(l) &&
    !l.match(/client|destinataire|acheteur/i)
  );
  if (companyLine) {
    add('fournisseur', companyLine.replace(/TVA.*|RC.*|RIB.*/i, '').trim());
  }

  // ── 2. Numéro de facture ──
  const numPatterns = [
    /facture[^n]*n[o°]?\s*[:\-]?\s*([\w\-\/]+)/i,
    /n[o°]\s*[:\-]\s*([\w\-\/]+)/i,
    /n°\s*([\w\-\/]+)/i,
    /PR\d{8,}/,          // Format PR21002601
    /FAC[\-\d]+/i,
    /F[\-\d]{6,}/i,
  ];
  for (const p of numPatterns) {
    const m = text.match(p);
    if (m) { add('numero_facture', m[1] || m[0]); break; }
  }

  // ── 3. Date ──
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) add('date_facturation', dateMatch[1]);

  const echeanceMatch = text.match(/[eé]ch[eé]ance\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
  if (echeanceMatch) add('date_echeance', echeanceMatch[1]);

  // ── 4. Client ──
  const clientPatterns = [
    /(?:client|destinataire|facturation|livraison)\s*[:\-]?\s*\n([^\n]+)/i,
    /adresse de facturation\s*\n([^\n]+)/i,
  ];
  for (const p of clientPatterns) {
    const m = text.match(p);
    if (m) { add('client', m[1].trim()); break; }
  }

  // ── 5. TVA ──
  const tvaMatch = text.match(/tva\s*[:\-]?\s*(\d+)\s*%/i);
  if (tvaMatch) add('taux_tva', tvaMatch[1] + '%');

  const tvaNumMatch = text.match(/(?:code\s*)?tva\s*[:\-]?\s*([\d]+[A-Z\/]+[\d]+)/i);
  if (tvaNumMatch) add('numero_tva', tvaNumMatch[1]);

  // ── 6. RC ──
  const rcMatch = text.match(/rc\s*[:\-]?\s*([\w\d]+)/i);
  if (rcMatch) add('registre_commerce', rcMatch[1]);

  // ── 7. RIB / IBAN ──
  const ribMatch = text.match(/rib\s*[:\-]?\s*([\d\s]{10,})/i);
  if (ribMatch) add('rib', ribMatch[1].trim());

  const ibanMatch = text.match(/iban\s*[:\-]?\s*([A-Z]{2}\d{2}[\s\d]+)/i);
  if (ibanMatch) add('iban', ibanMatch[1].trim());

  // ── 8. Téléphone ──
  const telMatch = text.match(/t[eé]l\s*[:\-]?\s*(\d[\d\s\/]{7,})/i);
  if (telMatch) add('telephone', telMatch[1].trim().split('/')[0].trim());

  const faxMatch = text.match(/fax\s*[:\-]?\s*(\d[\d\s\/]{7,})/i);
  if (faxMatch) add('fax', faxMatch[1].trim());

  // ── 9. Email ──
  const emailMatch = text.match(/[\w.\-]+@[\w.\-]+\.\w+/);
  if (emailMatch) add('email', emailMatch[0]);

  // ── 10. Totaux ──
  const totalPatterns = [
    { name: 'total_ht',   regex: /total\s*h\.?t\.?\s*[:\-]?\s*([\d\s.,]+)\s*(?:TND|DT|€)?/i },
    { name: 'remise',     regex: /remise[^:\n]*[:\-]?\s*[-–]?\s*([\d\s.,]+)\s*(?:TND|DT|€)?/i },
    { name: 'base_tva',   regex: /base\s*tva\s*[:\-]?\s*([\d\s.,]+)\s*(?:TND|DT|€)?/i },
    { name: 'tva_montant',regex: /montant\s*tva\s*[:\-]?\s*([\d\s.,]+)\s*(?:TND|DT|€)?/i },
    { name: 'timbre',     regex: /timbre[^:\n]*[:\-]?\s*([\d.,]+)\s*(?:TND|DT|€)?/i },
    { name: 'total_ttc',  regex: /total\s*t\.?t\.?c\.?\s*[:\-]?\s*([\d\s.,]+)\s*(?:TND|DT|€)?/i },
  ];

  for (const { name, regex } of totalPatterns) {
    const m = text.match(regex);
    if (m) add(name, m[1].trim());
  }

  // ── 11. Articles — Format avec | séparateur ──
  // Exemple: 165RA03 | COLLECT INCL PEX 12VOIE D20 3,000 225.840 | 707 520 18,00
  const articlePipeRegex = /^([A-Z0-9\/\-]+)\s*\|\s*(.+?)\s+([\d.,]+)\s+([\d.,]+)\s*\|\s*([\d\s.,]+)\s+([\d.,]+)/;

  // Format sans | mais avec colonnes espacées
  // Exemple: 1 Description 1 2500,000 TND 2500,000 TND
  const articleNumRegex = /^(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+([\d\s.,]+)\s*(?:TND|DT)?\s+([\d\s.,]+)\s*(?:TND|DT)?/;

  let articleCount = 0;

  lines.forEach((line) => {
    // Format avec pipe |
    const pipeMatch = line.match(articlePipeRegex);
    if (pipeMatch) {
      articleCount++;
      const num = articleCount.toString();
      add(`article_${num}_code`,         pipeMatch[1].trim());
      add(`article_${num}_description`,  pipeMatch[2].trim());
      add(`article_${num}_quantite`,     pipeMatch[3]);
      add(`article_${num}_prix_unitaire`,pipeMatch[4]);
      add(`article_${num}_total_ht`,     pipeMatch[5].trim());
      return;
    }

    // Format numéroté
    const numMatch = line.match(articleNumRegex);
    if (numMatch && !line.match(/total|remise|tva|timbre|base/i)) {
      const num = numMatch[1];
      add(`article_${num}_description`,  numMatch[2].trim());
      add(`article_${num}_quantite`,     numMatch[3]);
      add(`article_${num}_prix_unitaire`,numMatch[4].trim());
      add(`article_${num}_total_ht`,     numMatch[5].trim());
    }
  });

  // ── 12. Mode paiement ──
  const modeMatch = text.match(/mode\s*[:\-]?\s*([^\n]+)/i);
  if (modeMatch) add('mode_paiement', modeMatch[1].split(/tout|condition/i)[0].trim());

  const banqueMatch = text.match(/banque\s*[:\-]?\s*([^\n]+)/i);
  if (banqueMatch) add('banque', banqueMatch[1].split(/des\s*p[eé]nalit/i)[0].trim());

  const delaiMatch = text.match(/d[eé]lai\s*[:\-]?\s*([^\n]+)/i);
  if (delaiMatch) add('delai_paiement', delaiMatch[1].split(/merci/i)[0].trim());

  return fields;
}

module.exports = ocrService;