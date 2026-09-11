const scanService = require('../services/scanService');
const { success, created } = require('../utils/response');

const scanController = {

  async createScan(req, res, next) {
    try {
      const { image_base64, filename } = req.body;
      const userId = req.user.id;
      const result = await scanService.createScan(userId, image_base64, filename);
      return created(res, result, 'Scan completed successfully');
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req, res, next) {
    try {
      const userId  = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const scans   = await scanService.getHistory(userId, isAdmin);
      return success(res, { scans });
    } catch (err) {
      next(err);
    }
  },

  async getScanById(req, res, next) {
    try {
      const scanId  = parseInt(req.params.id);
      const userId  = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const result  = await scanService.getScanById(scanId, userId, isAdmin);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateScan(req, res, next) {
    try {
      const scanId  = parseInt(req.params.id);
      const userId  = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { filename, status } = req.body;
      const result  = await scanService.updateScan(scanId, userId, isAdmin, { filename, status });
      return success(res, { scan: result }, 'Scan updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteScan(req, res, next) {
    try {
      const scanId  = parseInt(req.params.id);
      const userId  = req.user.id;
      const isAdmin = req.user.role === 'admin';
      await scanService.deleteScan(scanId, userId, isAdmin);
      return success(res, null, 'Scan deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async validateField(req, res, next) {
    try {
      const fieldId = parseInt(req.params.fieldId);
      const { is_validated, corrected_value } = req.body;
      const result  = await scanService.validateField(fieldId, is_validated, corrected_value);
      return success(res, result, 'Field updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteField(req, res, next) {
    try {
      const fieldId = parseInt(req.params.fieldId);
      await scanService.deleteField(fieldId);
      return success(res, null, 'Field deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  // ✅ Cette méthode est maintenant correctement intégrée à l'objet exporté
  async validateAllFields(req, res, next) {
    try {
      const scanId = req.params.id;
      const { fields } = req.body;

      if (!fields) {
        return res.status(400).json({ success: false, message: 'Aucune donnée fournie' });
      }

      await scanService.saveAllFields(scanId, fields);
      return success(res, null, 'Tous les champs ont été sauvegardés avec succès');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = scanController;