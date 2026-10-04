const { BadRequestError } = require('../errors/AppError');
const { validateDateField } = require('../utils/validators');

/**
 * Middleware: Validate receipt creation payload
 * Accepts pengiriman_id (shipment doc ID) or unique_id (#PG-YYYYMMDD-COUNTER)
 */
function validateCreatePenerimaan(req, res, next) {
  const { pengiriman_id, unique_id, tanggal, qty_terima, nota_url, catatan } = req.body;
  const errors = [];

  if ((!pengiriman_id || typeof pengiriman_id !== 'string' || !pengiriman_id.trim()) &&
      (!unique_id || typeof unique_id !== 'string' || !unique_id.trim())) {
    errors.push('Either "pengiriman_id" (shipment document ID) or "unique_id" (#PG-YYYYMMDD-COUNTER) is required.');
  }

  if (unique_id !== undefined && unique_id !== null && unique_id !== '') {
    if (typeof unique_id !== 'string' || !/^#PG-\d{8}-\d{3,}$/.test(unique_id.trim())) {
      errors.push('Field "unique_id" must match format #PG-YYYYMMDD-COUNTER (e.g. "#PG-20261004-001").');
    }
  }

  if (qty_terima === undefined || qty_terima === null || qty_terima === '') {
    errors.push('Field "qty_terima" is required.');
  } else {
    const qty = Number(qty_terima);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 0) {
      errors.push('Field "qty_terima" must be a non-negative integer (0 or greater).');
    }
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

  if (nota_url !== undefined && nota_url !== null && nota_url !== '') {
    if (typeof nota_url !== 'string' || !nota_url.trim().startsWith('http')) {
      errors.push('Field "nota_url" must be a valid URL string.');
    }
  }

  if (catatan !== undefined && catatan !== null && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create receipt request.', errors));
  }

  next();
}

/**
 * Middleware: Validate receipt update payload
 */
function validateUpdatePenerimaan(req, res, next) {
  const { nota_url, catatan } = req.body;
  const errors = [];

  if (nota_url === undefined && catatan === undefined) {
    return next(new BadRequestError('At least one field ("nota_url", "catatan") must be provided for update.'));
  }

  if (nota_url !== undefined && nota_url !== null && nota_url !== '') {
    if (typeof nota_url !== 'string' || !nota_url.trim().startsWith('http')) {
      errors.push('Field "nota_url" must be a valid URL string.');
    }
  }

  if (catatan !== undefined && catatan !== null && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update receipt request.', errors));
  }

  next();
}

/**
 * Middleware: Validate uploaded nota file
 */
function validateUploadNota(req, res, next) {
  if (!req.file) {
    return next(new BadRequestError('No file uploaded. Please upload a PDF file under the "nota" field.'));
  }

  const isPdfMime = req.file.mimetype === 'application/pdf';
  const isPdfExt = req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf');

  if (!isPdfMime && !isPdfExt) {
    return next(new BadRequestError('Invalid file type. Only PDF documents (.pdf) are allowed.'));
  }

  next();
}

module.exports = {
  validateCreatePenerimaan,
  validateUpdatePenerimaan,
  validateUploadNota,
};
