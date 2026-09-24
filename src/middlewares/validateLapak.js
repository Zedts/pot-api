const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate lapak creation payload
 */
function validateCreateLapak(req, res, next) {
  const { nama, lokasi, keterangan } = req.body;
  const errors = [];

  if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
    errors.push('Field "nama" is required and must be at least 2 characters long.');
  }

  if (!lokasi || typeof lokasi !== 'string' || !lokasi.trim()) {
    errors.push('Field "lokasi" is required and cannot be empty.');
  }

  if (keterangan !== undefined && typeof keterangan !== 'string') {
    errors.push('Field "keterangan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create lapak request.', errors));
  }

  next();
}

/**
 * Middleware: Validate lapak update payload
 */
function validateUpdateLapak(req, res, next) {
  const { nama, lokasi, keterangan } = req.body;
  const errors = [];

  if (nama === undefined && lokasi === undefined && keterangan === undefined) {
    return next(
      new BadRequestError('At least one field (nama, lokasi, keterangan) must be provided for update.')
    );
  }

  if (nama !== undefined && (typeof nama !== 'string' || nama.trim().length < 2)) {
    errors.push('Field "nama" must be at least 2 characters long.');
  }

  if (lokasi !== undefined && (typeof lokasi !== 'string' || !lokasi.trim())) {
    errors.push('Field "lokasi" cannot be empty.');
  }

  if (keterangan !== undefined && typeof keterangan !== 'string') {
    errors.push('Field "keterangan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update lapak request.', errors));
  }

  next();
}

module.exports = {
  validateCreateLapak,
  validateUpdateLapak,
};
