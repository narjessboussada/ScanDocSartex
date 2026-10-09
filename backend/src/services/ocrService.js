const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');

const ocrService = {

  async analyze(imageBase64) {
    try {
      console.log('[OCR] Démarrage analyse...');

      const base64Data = imageBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // 1. Prétraitement Sharp
      const imageTraitee = await sharp(imageBuffer)
        .resize({ width: 2400, withoutEnlargement: false })
        .greyscale()
        .normalise()
        .sharpen({ sigma: 1.5 })
        .png()
        .toBuffer();

      const base64Traite = 'data:image/png;base64,' + imageTraitee.toString('base64');

      // 2. OCR avec Tesseract
      const result = await Tesseract.recognize(base64Traite, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const rawText = result.data.text.trim();
      const confiance = Math.round(result.data.confidence);
      const qualite = evaluerQualite(rawText, confiance);

      console.log('[IA] Envoi du texte brut à n8n pour structuration...');

      // 3. Appel à l'IA via n8n
      let structured = await appelerWorkflowN8N(rawText);

      // 4. Fallback sécurisé si l'IA échoue
      if (!structured) {
        console.warn('[IA] ⚠️ Fallback : IA indisponible, utilisation du texte brut');
        structured = { rawText };
      }

      // 5. Conversion en champs plats
      const fields = jsonVersFields(structured);

      return { rawText, fields, qualite, structured };

    } catch (err) {
      console.error('[OCR] Erreur critique :', err.message);
      const error = new Error('Impossible de lire le document');
      error.statusCode = 422;
      throw error;
    }
  }
};

// ── FONCTION D'APPEL À N8N ──────────────────────────────────────────────────

async function appelerWorkflowN8N(texteBrut) {
  try {
    const n8nWebhookUrl = 'http://localhost:5678/webhook/a7a2ad8b-3746-4de8-960e-37fbe4a364c6';
    
    console.log('[IA]  Envoi en cours... (cela peut prendre 2-3 minutes)');
    console.log('[IA] 📏 Taille du texte OCR:', texteBrut.length, 'caractères');

    const response = await axios.post(n8nWebhookUrl, {
      texte_ocr: texteBrut
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 300000 // 5 minutes
    });

    // Log la réponse BRUTE (type et contenu)
    console.log('[IA] 🔍 Type de réponse:', typeof response.data);
    console.log('[IA] 🔍 Réponse BRUTE:', JSON.stringify(response.data));
    console.log('[IA] 🔍 Longueur:', response.data ? response.data.length : 0);

    // Si la réponse est une chaîne vide
    if (!response.data || response.data === '' || response.data === '""') {
      console.error('[IA] ❌ n8n a renvoyé une chaîne vide');
      return null;
    }

    // Si c'est une chaîne, essayer de la parser
    let resultat;
    if (typeof response.data === 'string') {
      try {
        resultat = JSON.parse(response.data);
      } catch (e) {
        console.error('[IA] ❌ La réponse est une chaîne mais pas du JSON valide');
        console.error('[IA] Contenu:', response.data.substring(0, 500));
        return null;
      }
    } else {
      resultat = response.data;
    }

    if (resultat && resultat.success === true) {
      console.log('[IA] ✅ Extraction réussie par Ollama !');
      return resultat.data;
    }

    console.error('[IA] ❌ La réponse ne contient pas success:true');
    console.error('[IA] Contenu:', JSON.stringify(resultat).substring(0, 500));
    return null;

  } catch (error) {
    console.error('[IA] ❌ Erreur de connexion à n8n:', error.message);
    if (error.response) {
      console.error('[IA] Status:', error.response.status);
      console.error('[IA] Data:', error.response.data);
    }
    return null;
  }
}

// ── Conversion JSON en champs plats ────────────────────────────────────────

function jsonVersFields(json) {
  const fields = [];

  if (!json) return fields;

  // Adapter aux noms de champs que l'IA génère
  if (json.Facture_numero) fields.push({ name: 'numero_facture', value: String(json.Facture_numero) });
  if (json.Date) fields.push({ name: 'date_emission', value: String(json.Date) });
  if (json.Fournisseur) fields.push({ name: 'fournisseur_nom', value: String(json.Fournisseur) });
  if (json.Client) fields.push({ name: 'client_nom', value: String(json.Client) });
  if (json.Montant_HT) fields.push({ name: 'totaux_total_ht', value: String(json.Montant_HT) });
  if (json.TVA_taxe) fields.push({ name: 'totaux_total_tva', value: String(json.TVA_taxe) });
  if (json.Total_TTC) fields.push({ name: 'totaux_total_ttc', value: String(json.Total_TTC) });

  // Noms alternatifs si l'IA utilise notre format standard
  if (json.numero_facture) fields.push({ name: 'numero_facture', value: String(json.numero_facture) });
  if (json.date_emission) fields.push({ name: 'date_emission', value: String(json.date_emission) });
  if (json.fournisseur && json.fournisseur.nom) fields.push({ name: 'fournisseur_nom', value: String(json.fournisseur.nom) });
  if (json.client && json.client.nom) fields.push({ name: 'client_nom', value: String(json.client.nom) });
  if (json.totaux) {
    if (json.totaux.total_ht) fields.push({ name: 'totaux_total_ht', value: String(json.totaux.total_ht) });
    if (json.totaux.total_tva) fields.push({ name: 'totaux_total_tva', value: String(json.totaux.total_tva) });
    if (json.totaux.total_ttc) fields.push({ name: 'totaux_total_ttc', value: String(json.totaux.total_ttc) });
  }

  return fields;
}

// ── Évaluation qualité OCR ─────────────────────────────────────────────────

function evaluerQualite(text, confiance) {
  if (!text || text.length < 20 || confiance < 30) {
    return {
      niveau: 'mauvais', score: confiance || 0,
      message: 'Document illisible',
      conseil: 'Utilisez un document imprimé bien éclairé'
    };
  }
  if (confiance < 55) {
    return {
      niveau: 'faible', score: confiance,
      message: 'Qualité faible',
      conseil: 'Recadrez et éclairez mieux le document'
    };
  }
  if (confiance < 75) {
    return {
      niveau: 'moyen', score: confiance,
      message: 'Qualité acceptable',
      conseil: 'Vérifiez les montants et les dates'
    };
  }
  return {
    niveau: 'bon', score: confiance,
    message: 'Bonne qualité d\'extraction', conseil: null
  };
}

module.exports = ocrService;