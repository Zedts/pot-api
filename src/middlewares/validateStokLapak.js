const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate stock record creation payload
 */
function validateCreateStokLapak(req, res, next) {
  const { lapak_id, produk_id, stok_awal, stok_masuk, stok_terjual } = req.body;
  const errors = [];

  if (!lapak_id || typeof lapak_id !== 'string' || !lapak_id.trim()) {
    errors.push('Field "lapak_id" is required.');
  }

  if (!produk_id || typeof produk_id !== 'string' || !produk_id.trim()) {
    errors.push('Field "produk_id" is required.');
  }

  if (stok_awal !== undefined && stok_awal !== null) {
    const val = Number(stok_awal);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_awal" must be a non-negative number.');
    }
  }

  if (stok_masuk !== undefined && stok_masuk !== null) {
    const val = Number(stok_masuk);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_masuk" must be a non-negative number.');
    }
  }

  if (stok_terjual !== undefined && stok_terjual !== null) {
    const val = Number(stok_terjual);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_terjual" must be a non-negative number.');
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create stock request.', errors));
  }

  next();
}

/**
 * Middleware: Validate stock record update payload
 */
function validateUpdateStokLapak(req, res, next) {
  const { stok_awal, stok_masuk, stok_terjual } = req.body;
  const errors = [];

  if (stok_awal === undefined && stok_masuk === undefined && stok_terjual === undefined) {
    return next(
      new BadRequestError(
        'At least one field ("stok_awal", "stok_masuk", "stok_terjual") must be provided for update.'
      )
    );
  }

  if (stok_awal !== undefined && stok_awal !== null) {
    const val = Number(stok_awal);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_awal" must be a non-negative number.');
    }
  }

  if (stok_masuk !== undefined && stok_masuk !== null) {
    const val = Number(stok_masuk);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_masuk" must be a non-negative number.');
    }
  }

  if (stok_terjual !== undefined && stok_terjual !== null) {
    const val = Number(stok_terjual);
    if (isNaN(val) || val < 0) {
      errors.push('Field "stok_terjual" must be a non-negative number.');
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update stock request.', errors));
  }

  next();
}

module.exports = {
  validateCreateStokLapak,
  validateUpdateStokLapak,
};
