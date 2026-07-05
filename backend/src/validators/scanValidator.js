const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const scanValidator = {

  validateCreateScan(req, res, next) {
    const { image_base64, filename } = req.body;

    if (!image_base64)
      return next(createError('image_base64 is required', 400));

    // Vérifier que c'est bien du base64
const base64Regex = /^data:(image\/(jpeg|jpg|png|gif|webp|bmp|tiff)|application\/pdf);base64,/;
    if (!base64Regex.test(image_base64))
      return next(createError('image_base64 must be a valid base64 image (jpeg, png, pdf)', 400));

    // Vérifier la taille (max 5MB)
    const base64Data = image_base64.split(',')[1];
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    if (sizeInMB > 5)
      return next(createError('Image size must not exceed 5MB', 400));

    if (filename && typeof filename !== 'string')
      return next(createError('filename must be a string', 400));

    next();
  },

  validateUpdateScan(req, res, next) {
    const { filename, status } = req.body;

    if (!filename && !status)
      return next(createError('At least one field required (filename or status)', 400));

    const allowedStatus = ['pending', 'processing', 'completed', 'failed'];
    if (status && !allowedStatus.includes(status))
      return next(createError(`status must be one of: ${allowedStatus.join(', ')}`, 400));

    next();
  },

  validateField(req, res, next) {
    const { is_validated, corrected_value } = req.body;

    if (is_validated === undefined)
      return next(createError('is_validated is required', 400));

    if (typeof is_validated !== 'boolean')
      return next(createError('is_validated must be a boolean', 400));

    if (corrected_value && typeof corrected_value !== 'string')
      return next(createError('corrected_value must be a string', 400));

    next();
  },
};

module.exports = scanValidator;