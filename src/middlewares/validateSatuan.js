const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate satuan creation payload
 */
function validateCreateSatuan(req, res, next) {
  const { jenis_satuan } = req.body;
  const errors = [];

  if (!jenis_satuan || typeof jenis_satuan !== 'string' || !jenis_satuan.trim()) {
    errors.push('Field "jenis_satuan" is required and cannot be empty.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create satuan request.', errors));
  }

  next();
}

/**
 * Middleware: Validate satuan update payload
 */
function validateUpdateSatuan(req, res, next) {
  const { jenis_satuan } = req.body;
  const errors = [];

  if (jenis_satuan === undefined) {
    return next(
      new BadRequestError('Field "jenis_satuan" must be provided for update.')
    );
  }

  if (typeof jenis_satuan !== 'string' || !jenis_satuan.trim()) {
    errors.push('Field "jenis_satuan" cannot be empty.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update satuan request.', errors));
  }

  next();
}

module.exports = {
  validateCreateSatuan,
  validateUpdateSatuan,
};
