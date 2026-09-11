const express        = require('express');
const router         = express.Router();
const scanController = require('../controllers/scanController');
const { verifyToken }= require('../middleware/auth');
const scanValidator  = require('../validators/scanValidator');
const scanService    = require('../services/scanService');   // ← ajouter
const { success }    = require('../utils/response');         // ← ajouter

// ── Route JSON — DOIT être avant /:id ────────────────────
// POST /api/scan/json
router.post('/json', verifyToken, async (req, res, next) => {
  try {
    const { json_data, filename } = req.body;

    if (!json_data) {
      return res.status(400).json({
        success: false,
        message: 'json_data manquant dans le body'
      });
    }

    const userId = req.user.id;
    const result = await scanService.processerJSONEntreprise(
      userId, json_data, filename || 'facture.json'
    );

    return success(res, result, 'JSON traité avec succès');
  } catch (err) {
    next(err);
  }
});

// ── Routes CRUD ───────────────────────────────────────────
router.post('/',                  verifyToken, scanValidator.validateCreateScan, scanController.createScan);
router.get('/',                   verifyToken, scanController.getHistory);
router.get('/:id',                verifyToken, scanController.getScanById);
router.put('/:id',                verifyToken, scanValidator.validateUpdateScan,  scanController.updateScan);
router.delete('/:id',             verifyToken, scanController.deleteScan);
router.patch('/fields/:fieldId',  verifyToken, scanValidator.validateField,       scanController.validateField);
router.delete('/fields/:fieldId', verifyToken, scanController.deleteField);
router.post('/:id/validate-all', verifyToken, scanController.validateAllFields);
module.exports = router;