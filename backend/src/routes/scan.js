const express = require('express');
const router  = express.Router();
const scanController = require('../controllers/scanController');
const { verifyToken } = require('../middleware/auth');
const scanValidator = require('../validators/scanValidator');

router.post('/',                 verifyToken, scanValidator.validateCreateScan, scanController.createScan);
router.get('/',                  verifyToken, scanController.getHistory);
router.get('/:id',               verifyToken, scanController.getScanById);
router.put('/:id',               verifyToken, scanValidator.validateUpdateScan, scanController.updateScan);
router.delete('/:id',            verifyToken, scanController.deleteScan);
router.patch('/fields/:fieldId', verifyToken, scanValidator.validateField,      scanController.validateField);
router.delete('/fields/:fieldId',verifyToken, scanController.deleteField);

module.exports = router;