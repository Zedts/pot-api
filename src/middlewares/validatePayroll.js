const { VALID_PAYROLL_STATUSES, PAYROLL_STATUS } = require('../constants/payrollStatus');
const { BadRequestError } = require('../errors/AppError');

const PERIODE_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Middleware: Validate payload for creating a monthly payroll record
 */
function validateCreatePayroll(req, res, next) {
  const {
    user_id,
    periode,
    hari_kerja,
    total_penjualan,
    gaji_pokok,
    bonus_penjualan,
    lembur,
    potongan,
    kasbon,
    status,
  } = req.body;

  const errors = [];

  // 1. User ID validation
  if (!user_id || typeof user_id !== 'string' || !user_id.trim()) {
    errors.push('Field "user_id" is required and must be a valid user document ID.');
  } else {
    req.body.user_id = user_id.trim();
  }

  // 2. Periode validation ("yyyy-mm")
  if (!periode || typeof periode !== 'string' || !periode.trim()) {
    errors.push('Field "periode" is required (format: "yyyy-mm", e.g. "2026-10").');
  } else {
    const trimmedPeriode = periode.trim();
    if (!PERIODE_REGEX.test(trimmedPeriode)) {
      errors.push('Field "periode" must follow the format "yyyy-mm" (e.g., "2026-10").');
    } else {
      req.body.periode = trimmedPeriode;
    }
  }

  // 3. Hari kerja validation (integer >= 0)
  if (hari_kerja === undefined || hari_kerja === null || hari_kerja === '') {
    errors.push('Field "hari_kerja" is required.');
  } else {
    const hkNum = Number(hari_kerja);
    if (isNaN(hkNum) || !Number.isInteger(hkNum) || hkNum < 0) {
      errors.push('Field "hari_kerja" must be a non-negative integer.');
    } else {
      req.body.hari_kerja = hkNum;
    }
  }

  // 4. Numeric component validations
  const numericFields = [
    { name: 'total_penjualan', val: total_penjualan },
    { name: 'gaji_pokok', val: gaji_pokok },
    { name: 'bonus_penjualan', val: bonus_penjualan },
    { name: 'lembur', val: lembur },
    { name: 'potongan', val: potongan },
    { name: 'kasbon', val: kasbon },
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

  // 5. Status validation
  if (status !== undefined) {
    if (typeof status !== 'string') {
      errors.push('Field "status" must be a string.');
    } else {
      const normalizedStatus = status.toLowerCase().trim();
      if (!VALID_PAYROLL_STATUSES.includes(normalizedStatus)) {
        errors.push(`Invalid status "${status}". Allowed values: ${VALID_PAYROLL_STATUSES.join(', ')}.`);
      } else {
        req.body.status = normalizedStatus;
      }
    }
  } else {
    req.body.status = PAYROLL_STATUS.DRAFT;
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create payroll request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating payroll record
 */
function validateUpdatePayroll(req, res, next) {
  const {
    periode,
    hari_kerja,
    total_penjualan,
    gaji_pokok,
    bonus_penjualan,
    lembur,
    potongan,
    kasbon,
  } = req.body;

  const errors = [];

  if (
    periode === undefined &&
    hari_kerja === undefined &&
    total_penjualan === undefined &&
    gaji_pokok === undefined &&
    bonus_penjualan === undefined &&
    lembur === undefined &&
    potongan === undefined &&
    kasbon === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (periode, hari_kerja, total_penjualan, gaji_pokok, bonus_penjualan, lembur, potongan, kasbon) must be provided.'
      )
    );
  }

  if (periode !== undefined) {
    if (typeof periode !== 'string' || !PERIODE_REGEX.test(periode.trim())) {
      errors.push('Field "periode" must follow the format "yyyy-mm" (e.g., "2026-10").');
    } else {
      req.body.periode = periode.trim();
    }
  }

  if (hari_kerja !== undefined) {
    const hkNum = Number(hari_kerja);
    if (isNaN(hkNum) || !Number.isInteger(hkNum) || hkNum < 0) {
      errors.push('Field "hari_kerja" must be a non-negative integer.');
    } else {
      req.body.hari_kerja = hkNum;
    }
  }

  const numericFields = [
    { name: 'total_penjualan', val: total_penjualan },
    { name: 'gaji_pokok', val: gaji_pokok },
    { name: 'bonus_penjualan', val: bonus_penjualan },
    { name: 'lembur', val: lembur },
    { name: 'potongan', val: potongan },
    { name: 'kasbon', val: kasbon },
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

  // Explicitly disallow updating status via PUT
  if (req.body.status !== undefined) {
    errors.push('Field "status" cannot be updated via PUT. Use PATCH /api/v1/payroll/:id/status instead.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update payroll request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating payroll status
 */
function validateUpdateStatusPayroll(req, res, next) {
  const { status } = req.body;
  if (!status || typeof status !== 'string') {
    return next(
      new BadRequestError(
        `Field "status" is required. Allowed values: ${VALID_PAYROLL_STATUSES.join(', ')}.`
      )
    );
  }

  const normalizedStatus = status.toLowerCase().trim();
  if (!VALID_PAYROLL_STATUSES.includes(normalizedStatus)) {
    return next(
      new BadRequestError(
        `Invalid status "${status}". Allowed values: ${VALID_PAYROLL_STATUSES.join(', ')}.`
      )
    );
  }

  req.body.status = normalizedStatus;
  next();
}

module.exports = {
  validateCreatePayroll,
  validateUpdatePayroll,
  validateUpdateStatusPayroll,
};
