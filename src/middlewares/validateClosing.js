const { VALID_CLOSING_STATUSES, CLOSING_STATUS } = require('../constants/closingStatus');
const { BadRequestError } = require('../errors/AppError');

/**
 * Middleware: Validate payload for creating a closing record
 */
function validateCreateClosing(req, res, next) {
  const {
    lapak_id,
    spg_id,
    stok_sistem,
    stok_fisik,
    total_omset,
    tunai_sistem,
    qris_sistem,
    transfer_sistem,
    uang_tunai_fisik,
    catatan,
    status,
  } = req.body;

  const errors = [];
  const currentUser = req.user;

  // 1. Lapak ID validation
  if (!lapak_id) {
    if (currentUser && currentUser.lapak_id) {
      req.body.lapak_id = currentUser.lapak_id;
    } else {
      errors.push('Field "lapak_id" is required.');
    }
  } else if (typeof lapak_id !== 'string' || !lapak_id.trim()) {
    errors.push('Field "lapak_id" must be a non-empty string ID.');
  } else {
    req.body.lapak_id = lapak_id.trim();
  }

  // 2. Optional spg_id validation (when recorded by Admin)
  if (spg_id !== undefined && spg_id !== null) {
    if (typeof spg_id !== 'string' || !spg_id.trim()) {
      errors.push('Field "spg_id" must be a non-empty string user ID.');
    } else {
      req.body.spg_id = spg_id.trim();
    }
  }

  // 3. Numeric validations
  const numericFields = [
    { name: 'stok_sistem', val: stok_sistem },
    { name: 'stok_fisik', val: stok_fisik },
    { name: 'total_omset', val: total_omset },
    { name: 'tunai_sistem', val: tunai_sistem },
    { name: 'qris_sistem', val: qris_sistem },
    { name: 'transfer_sistem', val: transfer_sistem },
    { name: 'uang_tunai_fisik', val: uang_tunai_fisik },
  ];

  numericFields.forEach(({ name, val }) => {
    if (val === undefined || val === null || val === '') {
      errors.push(`Field "${name}" is required.`);
    } else {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        errors.push(`Field "${name}" must be a non-negative number.`);
      } else {
        req.body[name] = num;
      }
    }
  });

  // 4. Catatan validation
  if (catatan !== undefined && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  // 5. Status validation
  if (status !== undefined) {
    if (typeof status !== 'string') {
      errors.push(`Field "status" must be a string.`);
    } else {
      const normalizedStatus = status.toLowerCase().trim();
      if (!VALID_CLOSING_STATUSES.includes(normalizedStatus)) {
        errors.push(`Invalid status "${status}". Allowed values: ${VALID_CLOSING_STATUSES.join(', ')}.`);
      } else {
        req.body.status = normalizedStatus;
      }
    }
  } else {
    req.body.status = CLOSING_STATUS.PENDING;
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create closing request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating closing inputs
 */
function validateUpdateClosing(req, res, next) {
  const {
    stok_sistem,
    stok_fisik,
    total_omset,
    tunai_sistem,
    qris_sistem,
    transfer_sistem,
    uang_tunai_fisik,
    catatan,
  } = req.body;

  const errors = [];

  if (
    stok_sistem === undefined &&
    stok_fisik === undefined &&
    total_omset === undefined &&
    tunai_sistem === undefined &&
    qris_sistem === undefined &&
    transfer_sistem === undefined &&
    uang_tunai_fisik === undefined &&
    catatan === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (stok_sistem, stok_fisik, total_omset, tunai_sistem, qris_sistem, transfer_sistem, uang_tunai_fisik, catatan) must be provided.'
      )
    );
  }

  const numericFields = [
    { name: 'stok_sistem', val: stok_sistem },
    { name: 'stok_fisik', val: stok_fisik },
    { name: 'total_omset', val: total_omset },
    { name: 'tunai_sistem', val: tunai_sistem },
    { name: 'qris_sistem', val: qris_sistem },
    { name: 'transfer_sistem', val: transfer_sistem },
    { name: 'uang_tunai_fisik', val: uang_tunai_fisik },
  ];

  numericFields.forEach(({ name, val }) => {
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        errors.push(`Field "${name}" must be a non-negative number.`);
      } else {
        req.body[name] = num;
      }
    }
  });

  if (catatan !== undefined && typeof catatan !== 'string') {
    errors.push('Field "catatan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update closing request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating closing status (verification)
 */
function validateUpdateStatusClosing(req, res, next) {
  const { status } = req.body;
  if (!status || typeof status !== 'string') {
    return next(
      new BadRequestError(
        `Field "status" is required. Allowed values: ${VALID_CLOSING_STATUSES.join(', ')}.`
      )
    );
  }

  const normalizedStatus = status.toLowerCase().trim();
  if (!VALID_CLOSING_STATUSES.includes(normalizedStatus)) {
    return next(
      new BadRequestError(
        `Invalid status "${status}". Allowed values: ${VALID_CLOSING_STATUSES.join(', ')}.`
      )
    );
  }

  req.body.status = normalizedStatus;
  next();
}

module.exports = {
  validateCreateClosing,
  validateUpdateClosing,
  validateUpdateStatusClosing,
};
