const Tesseract = require('tesseract.js');
const sharp     = require('sharp');

const ocrService = {

  async analyze(imageBase64) {
    try {
      console.log('[OCR] Démarrage analyse...');

      const base64Data  = imageBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Prétraitement Sharp
      const imageTraitee = await sharp(imageBuffer)
        .resize({ width: 2400, withoutEnlargement: false })
        .greyscale()
        .normalise()
        .sharpen({ sigma: 1.5 })
        .png()
        .toBuffer();

      const base64Traite = 'data:image/png;base64,'
        + imageTraitee.toString('base64');

      const result = await Tesseract.recognize(base64Traite, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const rawText   = result.data.text.trim();
      const confiance = Math.round(result.data.confidence);
      const qualite   = evaluerQualite(rawText, confiance);

      // Convertit le texte brut en format JSON structuré
      const structured = convertirEnJSON(rawText);
      const fields     = jsonVersFields(structured);

      return { rawText, fields, qualite, structured };

    } catch (err) {
      console.error('[OCR] Erreur :', err.message);
      const error = new Error('Impossible de lire le document');
      error.statusCode = 422;
      throw error;
    }
  },

  /**
   * TODO Phase 2 — Remplace analyze() par cet appel API entreprise
   * quand l'API sera disponible
   *
   * async analyzeWithAPI(imageBase64) {
   *   const response = await axios.post(process.env.API_ENTREPRISE_URL, {
   *     image: imageBase64
   *   }, {
   *     headers: { 'Authorization': `Bearer ${process.env.API_ENTREPRISE_KEY}` }
   *   });
   *   const json = response.data; // format identique à celui ci-dessous
   *   return traiterJSONEntreprise(json);
   * }
   */

  /**
   * Traite le JSON retourné par l'API de l'entreprise
   * Peut être appelé directement quand l'API sera disponible
   */
  traiterJSONEntreprise(json) {
    return traiterJSONEntreprise(json);
  }
};

// ── Traitement du JSON structuré de l'API entreprise ──────────────────────

function traiterJSONEntreprise(json) {
  const facture = json.facture || json;
  const rawText = genererTexteDepuisJSON(facture);
  const fields  = jsonVersFields(facture);
  const qualite = { niveau: 'bon', score: 100, message: 'Extraction API réussie', conseil: null };

  return { rawText, fields, qualite, structured: facture };
}

/**
 * Convertit un JSON de facture en tableau de champs plats
 * Compatible avec la table extracted_data (field_name, field_value)
 */
function jsonVersFields(json) {
  const fields = [];

  if (!json || !json.facture) return flattenSimple(json, fields);

  const f = json.facture || json;

  // ─── Infos générales ───────────────────────────────────
  if (f.numero_facture)  fields.push({ name: 'numero_facture',  value: f.numero_facture });
  if (f.date_emission)   fields.push({ name: 'date_emission',   value: f.date_emission });
  if (f.date_echeance)   fields.push({ name: 'date_echeance',   value: f.date_echeance });
  if (f.devise)          fields.push({ name: 'devise',          value: f.devise });
  if (f.mode_paiement)   fields.push({ name: 'mode_paiement',   value: f.mode_paiement });

  // ─── Fournisseur ───────────────────────────────────────
  if (f.fournisseur) {
    const fo = f.fournisseur;
    if (fo.nom)               fields.push({ name: 'fournisseur_nom',     value: fo.nom });
    if (fo.adresse)           fields.push({ name: 'fournisseur_adresse', value: fo.adresse });
    if (fo.identifiant_fiscal)fields.push({ name: 'fournisseur_mf',      value: fo.identifiant_fiscal });
    if (fo.telephone)         fields.push({ name: 'fournisseur_tel',     value: fo.telephone });
    if (fo.email)             fields.push({ name: 'fournisseur_email',   value: fo.email });
  }

  // ─── Client ────────────────────────────────────────────
  if (f.client) {
    const cl = f.client;
    if (cl.nom)               fields.push({ name: 'client_nom',     value: cl.nom });
    if (cl.adresse)           fields.push({ name: 'client_adresse', value: cl.adresse });
    if (cl.identifiant_fiscal)fields.push({ name: 'client_mf',      value: cl.identifiant_fiscal });
  }

  // ─── Lignes / Articles ─────────────────────────────────
  if (f.lignes && Array.isArray(f.lignes)) {
    f.lignes.forEach((ligne, i) => {
      const n = i + 1;
      if (ligne.description)  fields.push({ name: `lignes_${n}_description`,  value: String(ligne.description) });
      if (ligne.quantite)     fields.push({ name: `lignes_${n}_quantite`,      value: String(ligne.quantite) });
      if (ligne.prix_unitaire)fields.push({ name: `lignes_${n}_prix_unitaire`, value: String(ligne.prix_unitaire) });
      if (ligne.montant_ht)   fields.push({ name: `lignes_${n}_montant_ht`,    value: String(ligne.montant_ht) });
      if (ligne.tva)          fields.push({ name: `lignes_${n}_tva`,           value: String(ligne.tva) });
    });
  }

// ─── Totaux ────────────────────────────────────────────
if (f.totaux) {
  const t = f.totaux;
  if (t.total_ht  != null) fields.push({ name: 'totaux_total_ht',  value: String(t.total_ht) });
  if (t.total_tva != null) fields.push({ name: 'totaux_total_tva', value: String(t.total_tva) });
  if (t.total_ttc != null) fields.push({ name: 'totaux_total_ttc', value: String(t.total_ttc) });
  if (t.remise)            fields.push({ name: 'totaux_remise',     value: String(t.remise) });
  if (t.timbre_fiscal)     fields.push({ name: 'totaux_timbre',     value: String(t.timbre_fiscal) });
}
  return fields;
}

// Flatten simple pour les JSON sans structure facture
function flattenSimple(obj, fields = [], prefix = '') {
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === null || value === undefined) continue;
    const name = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      flattenSimple(value, fields, name);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object') flattenSimple(v, fields, `${name}_${i + 1}`);
        else fields.push({ name: `${name}_${i + 1}`, value: String(v) });
      });
    } else {
      fields.push({ name, value: String(value) });
    }
  }
  return fields;
}

// Génère un texte brut lisible depuis le JSON
function genererTexteDepuisJSON(facture) {
  const f = facture.facture || facture;
  const lines = [];

  lines.push(`Facture N° : ${f.numero_facture || '—'}`);
  lines.push(`Date d'émission : ${f.date_emission || '—'}`);
  if (f.date_echeance) lines.push(`Date d'échéance : ${f.date_echeance}`);
  lines.push('');

  if (f.fournisseur) {
    lines.push(`Fournisseur : ${f.fournisseur.nom || '—'}`);
    if (f.fournisseur.adresse)            lines.push(`Adresse : ${f.fournisseur.adresse}`);
    if (f.fournisseur.identifiant_fiscal) lines.push(`MF : ${f.fournisseur.identifiant_fiscal}`);
    if (f.fournisseur.telephone)          lines.push(`Tél : ${f.fournisseur.telephone}`);
    if (f.fournisseur.email)              lines.push(`Email : ${f.fournisseur.email}`);
  }
  lines.push('');

  if (f.client) {
    lines.push(`Client : ${f.client.nom || '—'}`);
    if (f.client.adresse) lines.push(`Adresse : ${f.client.adresse}`);
  }
  lines.push('');

  if (f.lignes) {
    lines.push('Articles :');
    f.lignes.forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.description}`);
      lines.push(`     Qté: ${l.quantite} | PU: ${l.prix_unitaire} | HT: ${l.montant_ht}`);
    });
  }
  lines.push('');

  if (f.totaux) {
    lines.push(`Total HT  : ${f.totaux.total_ht}`);
    lines.push(`Total TVA : ${f.totaux.total_tva}`);
    lines.push(`Total TTC : ${f.totaux.total_ttc}`);
  }

  if (f.mode_paiement) lines.push(`Mode de paiement : ${f.mode_paiement}`);

  return lines.join('\n');
}

// ── Évaluation qualité OCR ─────────────────────────────────────────────────

function evaluerQualite(text, confiance) {
  if (!text || text.length < 20 || confiance < 30) {
    return { niveau: 'mauvais', score: confiance || 0,
      message: 'Document illisible — écriture manuscrite ou image floue',
      conseil: 'Utilisez un document imprimé bien éclairé' };
  }
  if (confiance < 55) {
    return { niveau: 'faible', score: confiance,
      message: 'Qualité faible — vérifiez les champs extraits',
      conseil: 'Recadrez et éclairez mieux le document' };
  }
  if (confiance < 75) {
    return { niveau: 'moyen', score: confiance,
      message: 'Qualité acceptable',
      conseil: 'Vérifiez les montants et les dates' };
  }
  return { niveau: 'bon', score: confiance,
    message: 'Bonne qualité d\'extraction', conseil: null };
}

// ── Conversion texte brut → JSON (Tesseract fallback) ──────────────────────

function convertirEnJSON(rawText) {
  return { rawText };
}

// ── Extraction des champs depuis le texte brut ─────────────────────────────

function extractFields(text) {
  const fields = [];
  const lines  = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  const patterns = [
    { name: 'numero_facture',  regex: /(?:facture\s*n[o°]?\.?\s*:?\s*|invoice\s*#?\s*:?\s*)([A-Z0-9\-\/]+)/i },
    { name: 'date_emission',   regex: /(?:date\s*(?:d.émission|de\s*facturation|facture)?\s*:?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i },
    { name: 'date_echeance',   regex: /(?:échéance|echeance|due\s*date)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i },
    { name: 'fournisseur_nom', regex: /(?:fournisseur|émetteur|de\s*:)\s*:?\s*(.{3,50})/i },
    { name: 'client_nom',      regex: /(?:client|destinataire|à\s*:)\s*:?\s*(.{3,50})/i },
    { name: 'total_ht',        regex: /(?:total\s*h\.?t\.?)\s*:?\s*([\d\s]+[,\.]\d{2,3})/i },
    { name: 'total_tva',       regex: /(?:tva|t\.v\.a)\s*(?:\(?\d+%?\)?)?\s*:?\s*([\d\s]+[,\.]\d{2,3})/i },
    { name: 'total_ttc',       regex: /(?:total\s*t\.?t\.?c\.?|net\s*à\s*payer)\s*:?\s*([\d\s]+[,\.]\d{2,3})/i },
    { name: 'devise',          regex: /(?:devise|currency|en)\s*:?\s*(EUR|TND|DT|USD)/i },
    { name: 'mode_paiement',   regex: /(?:mode\s*(?:de\s*)?paiement|payment\s*terms?)\s*:?\s*(.{3,50})/i },
    { name: 'fournisseur_email', regex: /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/ },
    { name: 'fournisseur_tel', regex: /(?:tél?\.?\s*:?\s*)(\+?[\d\s\-\.]{8,})/ },
    { name: 'fournisseur_mf',  regex: /(?:matricule|MF|fiscal)\s*:?\s*([A-Z0-9\/]{5,})/ },
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match && match[1]) {
      fields.push({ name: p.name, value: match[1].trim() });
    }
  }

  // Lignes clé : valeur
  const existing = fields.map(f => f.name);
  for (const line of lines) {
    if (!line.includes(':') || line.length > 150) continue;
    const idx   = line.indexOf(':');
    const key   = line.substring(0, idx).trim();
    const value = line.substring(idx + 1).trim();
    const name  = key.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    if (key.length > 1 && value.length > 0 && !existing.includes(name)) {
      fields.push({ name, value });
      existing.push(name);
    }
  }

  return fields;
}

module.exports = ocrService;