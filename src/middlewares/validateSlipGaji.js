const { BadRequestError } = require('../errors/AppError');
const uploadPdf = require('./uploadPdf.middleware');

/**
 * Middleware: Validate payload for creating a slip gaji record
 */
function validateCreateSlipGaji(req, res, next) {
  const { payroll_id, file_url, tanggal } = req.body;
  const errors = [];

  // 1. Payroll ID validation
  if (!payroll_id || typeof payroll_id !== 'string' || !payroll_id.trim()) {
    errors.push('Field "payroll_id" is required and must be a valid payroll document ID.');
  } else {
    req.body.payroll_id = payroll_id.trim();
  }

  // 2. Optional file_url validation
  if (file_url !== undefined && file_url !== null) {
    if (typeof file_url !== 'string' || !file_url.trim()) {
      errors.push('Field "file_url" must be a non-empty string URL.');
    } else {
      req.body.file_url = file_url.trim();
    }
  }

  // 3. Optional tanggal validation
  if (tanggal !== undefined && tanggal !== null) {
    if (typeof tanggal !== 'string' || !tanggal.trim()) {
      errors.push('Field "tanggal" must be a string (e.g. "YYYY-MM-DD").');
    } else {
      req.body.tanggal = tanggal.trim();
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create slip gaji request.', errors));
  }

  next();
}

module.exports = {
  validateCreateSlipGaji,
  uploadPdf,
};
