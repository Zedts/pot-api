const { VALID_METODE_PEMBAYARAN, METODE_PEMBAYARAN } = require('../constants/metodePembayaran');
const { ROLES } = require('../constants/roles');
const { BadRequestError } = require('../errors/AppError');
const { validateDateField, parseDateOrDefault } = require('../utils/validators');

/**
 * Middleware: Validate payload for creating a sales transaction
 */
function validateCreatePenjualan(req, res, next) {
  const { tanggal, lapak_id, spg_id, metode_pembayaran, bukti_qris_url, catatan, items } = req.body;
  const errors = [];

  // 1. Validate tanggal if provided (supports "2026-09-30", ISO string, or omitted defaulting to new Date())
  const dateError = validateDateField(tanggal, 'tanggal');
  if (dateError) {
    errors.push(dateError);
  } else {
    req.body.parsedTanggal = parseDateOrDefault(tanggal);
  }

  // 2. Validate lapak_id: caller context check
  const currentUser = req.user;
  if (!lapak_id) {
    if (currentUser && currentUser.role === ROLES.SPG && currentUser.lapak_id) {
      req.body.lapak_id = currentUser.lapak_id;
    } else {
      errors.push('Field "lapak_id" is required.');
    }
  } else if (typeof lapak_id !== 'string' || !lapak_id.trim()) {
    errors.push('Field "lapak_id" must be a non-empty string document ID.');
  } else {
    req.body.lapak_id = lapak_id.trim();
  }

  // 3. Optional spg_id validation (when recorded by Admin on behalf of an SPG)
  if (spg_id !== undefined && spg_id !== null) {
    if (typeof spg_id !== 'string' || !spg_id.trim()) {
      errors.push('Field "spg_id" must be a non-empty string ID.');
    } else {
      req.body.spg_id = spg_id.trim();
    }
  }

  // 4. Validate metode_pembayaran
  if (!metode_pembayaran || typeof metode_pembayaran !== 'string') {
    errors.push(`Field "metode_pembayaran" is required. Allowed values: ${VALID_METODE_PEMBAYARAN.join(', ')}.`);
  } else {
    const normalizedMetode = metode_pembayaran.toLowerCase().trim();
    if (!VALID_METODE_PEMBAYARAN.includes(normalizedMetode)) {
      errors.push(`Invalid metode_pembayaran "${metode_pembayaran}". Allowed values: ${VALID_METODE_PEMBAYARAN.join(', ')}.`);
    } else {
      req.body.metode_pembayaran = normalizedMetode;
    }
  }

  // 5. Validate bukti_qris_url if provided
  if (bukti_qris_url !== undefined && bukti_qris_url !== null) {
    if (typeof bukti_qris_url !== 'string' || !bukti_qris_url.trim()) {
      errors.push('Field "bukti_qris_url" must be a valid URL string or null.');
    } else {
      req.body.bukti_qris_url = bukti_qris_url.trim();
    }
  }

  // 6. Validate catatan
  if (catatan !== undefined && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  // 7. Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Field "items" must be a non-empty array of line items.');
  } else {
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item at index [${index}] must be a valid object.`);
        return;
      }

      if (!item.produk_id || typeof item.produk_id !== 'string' || !item.produk_id.trim()) {
        errors.push(`Item at index [${index}]: field "produk_id" is required and must be a non-empty string.`);
      }

      if (item.qty === undefined || item.qty === null) {
        errors.push(`Item at index [${index}]: field "qty" is required.`);
      } else {
        const qtyNum = Number(item.qty);
        if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
          errors.push(`Item at index [${index}]: field "qty" must be a positive integer greater than or equal to 1.`);
        }
      }
    });
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create penjualan request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating sales transaction metadata
 */
function validateUpdatePenjualan(req, res, next) {
  const { metode_pembayaran, bukti_qris_url, catatan } = req.body;
  const errors = [];

  if (metode_pembayaran === undefined && bukti_qris_url === undefined && catatan === undefined) {
    return next(
      new BadRequestError(
        'At least one field (metode_pembayaran, bukti_qris_url, catatan) must be provided for update.'
      )
    );
  }

  if (metode_pembayaran !== undefined) {
    if (typeof metode_pembayaran !== 'string') {
      errors.push(`Field "metode_pembayaran" must be a string.`);
    } else {
      const normalizedMetode = metode_pembayaran.toLowerCase().trim();
      if (!VALID_METODE_PEMBAYARAN.includes(normalizedMetode)) {
        errors.push(`Invalid metode_pembayaran "${metode_pembayaran}". Allowed values: ${VALID_METODE_PEMBAYARAN.join(', ')}.`);
      } else {
        req.body.metode_pembayaran = normalizedMetode;
      }
    }
  }

  if (bukti_qris_url !== undefined && bukti_qris_url !== null) {
    if (typeof bukti_qris_url !== 'string' || !bukti_qris_url.trim()) {
      errors.push('Field "bukti_qris_url" must be a valid URL string or null.');
    } else {
      req.body.bukti_qris_url = bukti_qris_url.trim();
    }
  }

  if (catatan !== undefined && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update penjualan request.', errors));
  }

  next();
}

module.exports = {
  validateCreatePenjualan,
  validateUpdatePenjualan,
};
