const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate kategori creation payload
 */
function validateCreateKategori(req, res, next) {
  const { nama_kategori } = req.body;
  const errors = [];

  if (!nama_kategori || typeof nama_kategori !== 'string' || nama_kategori.trim().length < 2) {
    errors.push('Field "nama_kategori" is required and must be at least 2 characters long.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create kategori request.', errors));
  }

  next();
}

/**
 * Middleware: Validate kategori update payload
 */
function validateUpdateKategori(req, res, next) {
  const { nama_kategori } = req.body;
  const errors = [];

  if (nama_kategori === undefined) {
    return next(
      new BadRequestError('Field "nama_kategori" must be provided for update.')
    );
  }

  if (typeof nama_kategori !== 'string' || nama_kategori.trim().length < 2) {
    errors.push('Field "nama_kategori" must be at least 2 characters long.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update kategori request.', errors));
  }

  next();
}

module.exports = {
  validateCreateKategori,
  validateUpdateKategori,
};
