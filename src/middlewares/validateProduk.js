const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate produk creation payload
 */
function validateCreateProduk(req, res, next) {
  const { nama, harga, kategori_id, satuan_id } = req.body;
  const errors = [];

  if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
    errors.push('Field "nama" is required and must be at least 2 characters long.');
  }

  if (harga === undefined || harga === null || isNaN(Number(harga)) || Number(harga) < 0) {
    errors.push('Field "harga" is required and must be a non-negative number.');
  }

  if (!kategori_id || typeof kategori_id !== 'string' || !kategori_id.trim()) {
    errors.push('Field "kategori_id" is required and cannot be empty.');
  }

  if (!satuan_id || typeof satuan_id !== 'string' || !satuan_id.trim()) {
    errors.push('Field "satuan_id" is required and cannot be empty.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create produk request.', errors));
  }

  next();
}

/**
 * Middleware: Validate produk update payload
 */
function validateUpdateProduk(req, res, next) {
  const { nama, harga, kategori_id, satuan_id } = req.body;
  const errors = [];

  if (nama === undefined && harga === undefined && kategori_id === undefined && satuan_id === undefined) {
    return next(
      new BadRequestError('At least one field (nama, harga, kategori_id, satuan_id) must be provided for update.')
    );
  }

  if (nama !== undefined && (typeof nama !== 'string' || nama.trim().length < 2)) {
    errors.push('Field "nama" must be at least 2 characters long.');
  }

  if (harga !== undefined && (isNaN(Number(harga)) || Number(harga) < 0)) {
    errors.push('Field "harga" must be a non-negative number.');
  }

  if (kategori_id !== undefined && (typeof kategori_id !== 'string' || !kategori_id.trim())) {
    errors.push('Field "kategori_id" cannot be empty.');
  }

  if (satuan_id !== undefined && (typeof satuan_id !== 'string' || !satuan_id.trim())) {
    errors.push('Field "satuan_id" cannot be empty.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update produk request.', errors));
  }

  next();
}

module.exports = {
  validateCreateProduk,
  validateUpdateProduk,
};
