const { BadRequestError } = require('../errors/AppError');
const { VALID_PENGIRIMAN_STATUSES } = require('../constants/pengirimanStatus');
const { validateDateField } = require('../utils/validators');

/**
 * Middleware: Validate shipment creation payload
 */
function validateCreatePengiriman(req, res, next) {
  const { lapak_id, tanggal, pengirim_id, items, asal_lapak_id } = req.body;
  const errors = [];

  if (!lapak_id || typeof lapak_id !== 'string' || !lapak_id.trim()) {
    errors.push('Field "lapak_id" is required and cannot be empty.');
  }

  if (asal_lapak_id !== undefined && asal_lapak_id !== null) {
    if (typeof asal_lapak_id !== 'string' || !asal_lapak_id.trim()) {
      errors.push('Field "asal_lapak_id" must be a non-empty string if provided.');
    } else if (asal_lapak_id.trim() === (lapak_id && typeof lapak_id === 'string' ? lapak_id.trim() : '')) {
      errors.push('Field "asal_lapak_id" cannot be identical to "lapak_id" (origin and destination stalls must be different).');
    }
  }

  if (!pengirim_id || typeof pengirim_id !== 'string' || !pengirim_id.trim()) {
    errors.push('Field "pengirim_id" is required and cannot be empty.');
  }

  if (tanggal !== undefined && tanggal !== null) {
    if (typeof tanggal === 'string' && tanggal.trim() === '') {
      delete req.body.tanggal;
    } else {
      const dateErr = validateDateField(tanggal);
      if (dateErr) {
        errors.push(dateErr);
      }
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Field "items" is required and must contain at least one product item.');
  } else {
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item at index ${index} must be an object.`);
        return;
      }

      if (!item.produk_id || typeof item.produk_id !== 'string' || !item.produk_id.trim()) {
        errors.push(`Item at index ${index}: "produk_id" is required.`);
      }

      const qty = Number(item.qty);
      if (item.qty === undefined || item.qty === null || isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
        errors.push(`Item at index ${index}: "qty" must be a positive integer greater than zero.`);
      }
    });
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create shipment request.', errors));
  }

  next();
}

/**
 * Middleware: Validate shipment metadata update payload
 */
function validateUpdatePengiriman(req, res, next) {
  const { lapak_id, asal_lapak_id, tanggal, pengirim_id, status, items } = req.body;
  const errors = [];

  if (lapak_id === undefined && asal_lapak_id === undefined && tanggal === undefined && pengirim_id === undefined && status === undefined && items === undefined && !req.file) {
    return next(new BadRequestError('At least one field (lapak_id, asal_lapak_id, tanggal, pengirim_id, status, items, ttd_pengirim) must be provided for update.'));
  }

  if (lapak_id !== undefined && (typeof lapak_id !== 'string' || !lapak_id.trim())) {
    errors.push('Field "lapak_id" cannot be empty.');
  }

  if (asal_lapak_id !== undefined && asal_lapak_id !== null && asal_lapak_id !== '') {
    if (typeof asal_lapak_id !== 'string' || !asal_lapak_id.trim()) {
      errors.push('Field "asal_lapak_id" must be a non-empty string if provided.');
    } else if (lapak_id && typeof lapak_id === 'string' && asal_lapak_id.trim() === lapak_id.trim()) {
      errors.push('Field "asal_lapak_id" cannot be identical to "lapak_id" (origin and destination stalls must be different).');
    }
  }

  if (pengirim_id !== undefined && (typeof pengirim_id !== 'string' || !pengirim_id.trim())) {
    errors.push('Field "pengirim_id" cannot be empty.');
  }

  if (tanggal !== undefined && tanggal !== null) {
    const dateErr = validateDateField(tanggal);
    if (dateErr) {
      errors.push(dateErr);
    }
  }

  if (status !== undefined) {
    if (!status || typeof status !== 'string' || !status.trim()) {
      errors.push('Field "status" cannot be empty.');
    } else {
      const cleanStatus = status.trim().toLowerCase();
      if (!VALID_PENGIRIMAN_STATUSES.includes(cleanStatus)) {
        errors.push(
          `Field "status" must be one of the allowed values: ${VALID_PENGIRIMAN_STATUSES.join(', ')}.`
        );
      }
    }
  }

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Field "items" must be a non-empty array when provided.');
    } else {
      items.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          errors.push(`Item at index ${index} must be an object.`);
          return;
        }

        if (!item.produk_id || typeof item.produk_id !== 'string' || !item.produk_id.trim()) {
          errors.push(`Item at index ${index}: "produk_id" is required.`);
        }

        const qty = Number(item.qty);
        if (item.qty === undefined || item.qty === null || isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
          errors.push(`Item at index ${index}: "qty" must be a positive integer greater than zero.`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update shipment request.', errors));
  }

  next();
}

/**
 * Middleware: Validate shipment status transition payload
 */
function validateUpdateStatus(req, res, next) {
  const { status } = req.body;
  const errors = [];

  if (!status || typeof status !== 'string' || !status.trim()) {
    errors.push('Field "status" is required.');
  } else {
    const cleanStatus = status.trim().toLowerCase();
    if (!VALID_PENGIRIMAN_STATUSES.includes(cleanStatus)) {
      errors.push(
        `Field "status" must be one of the allowed values: ${VALID_PENGIRIMAN_STATUSES.join(', ')}.`
      );
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update shipment status request.', errors));
  }

  next();
}

module.exports = {
  validateCreatePengiriman,
  validateUpdatePengiriman,
  validateUpdateStatus,
};
