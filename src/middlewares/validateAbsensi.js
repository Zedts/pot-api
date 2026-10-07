const { VALID_ABSENSI_STATUSES, ABSENSI_STATUS } = require('../constants/absensiStatus');
const { BadRequestError } = require('../errors/AppError');
const { validateDateField, parseDateOrDefault } = require('../utils/validators');

/**
 * Middleware: Validate payload for clocking in / recording attendance
 */
function validateClockIn(req, res, next) {
  const { lapak_id, status, lokasi_masuk, foto_masuk_url, keterangan, tanggal } = req.body;
  const errors = [];

  // 1. Tanggal validation (optional, supports "YYYY-MM-DD", ISO string, or omitted defaulting to now)
  const dateError = validateDateField(tanggal);
  if (dateError) {
    errors.push(dateError);
  } else if (tanggal) {
    req.body.parsedTanggal = parseDateOrDefault(tanggal);
  }

  // 1b. Jam Masuk validation (optional client timestamp)
  const { jam_masuk } = req.body;
  if (jam_masuk) {
    const jamError = validateDateField(jam_masuk);
    if (jamError) {
      errors.push('Field "jam_masuk" must be a valid date or timestamp string.');
    }
  }

  // 2. Lapak ID validation
  const currentUser = req.user;
  if (!lapak_id) {
    if (currentUser && currentUser.lapak_id) {
      req.body.lapak_id = currentUser.lapak_id;
    } else {
      errors.push('Field "lapak_id" is required (or authenticated user must have an assigned lapak_id).');
    }
  } else if (typeof lapak_id !== 'string' || !lapak_id.trim()) {
    errors.push('Field "lapak_id" must be a non-empty string document ID.');
  } else {
    req.body.lapak_id = lapak_id.trim();
  }

  // 2. Status validation
  if (status !== undefined) {
    if (typeof status !== 'string') {
      errors.push(`Field "status" must be a string. Allowed values: ${VALID_ABSENSI_STATUSES.join(', ')}.`);
    } else {
      const normalizedStatus = status.toLowerCase().trim();
      if (!VALID_ABSENSI_STATUSES.includes(normalizedStatus)) {
        errors.push(`Invalid status "${status}". Allowed values: ${VALID_ABSENSI_STATUSES.join(', ')}.`);
      } else {
        req.body.status = normalizedStatus;
      }
    }
  } else {
    req.body.status = ABSENSI_STATUS.HADIR;
  }

  // 3. Foto validation
  if (foto_masuk_url !== undefined && foto_masuk_url !== null) {
    if (typeof foto_masuk_url !== 'string' || !foto_masuk_url.trim()) {
      errors.push('Field "foto_masuk_url" must be a non-empty string URL.');
    } else {
      req.body.foto_masuk_url = foto_masuk_url.trim();
    }
  }

  // 4. Lokasi masuk validation
  if (lokasi_masuk !== undefined && lokasi_masuk !== null) {
    if (typeof lokasi_masuk === 'string') {
      req.body.lokasi_masuk = lokasi_masuk.trim();
    } else if (typeof lokasi_masuk === 'object') {
      req.body.lokasi_masuk = lokasi_masuk;
    } else {
      errors.push('Field "lokasi_masuk" must be an object { latitude, longitude } or coordinate string.');
    }
  }

  // 5. Keterangan validation
  if (keterangan !== undefined && typeof keterangan !== 'string') {
    errors.push('Field "keterangan" must be a string.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for clock-in request.', errors));
  }

  next();
}

/**
 * Middleware: Validate payload for updating attendance records
 */
function validateUpdateAbsensi(req, res, next) {
  const { status, lokasi_masuk, foto_masuk_url, keterangan, jam_masuk, jam_pulang, lapak_id } = req.body;
  const errors = [];

  if (
    status === undefined &&
    lokasi_masuk === undefined &&
    foto_masuk_url === undefined &&
    keterangan === undefined &&
    jam_masuk === undefined &&
    jam_pulang === undefined &&
    lapak_id === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (status, lokasi_masuk, foto_masuk_url, keterangan, jam_masuk, jam_pulang, lapak_id) must be provided.'
      )
    );
  }

  if (status !== undefined) {
    if (typeof status !== 'string') {
      errors.push(`Field "status" must be a string.`);
    } else {
      const normalizedStatus = status.toLowerCase().trim();
      if (!VALID_ABSENSI_STATUSES.includes(normalizedStatus)) {
        errors.push(`Invalid status "${status}". Allowed values: ${VALID_ABSENSI_STATUSES.join(', ')}.`);
      } else {
        req.body.status = normalizedStatus;
      }
    }
  }

  if (foto_masuk_url !== undefined && foto_masuk_url !== null) {
    if (typeof foto_masuk_url !== 'string' || !foto_masuk_url.trim()) {
      errors.push('Field "foto_masuk_url" must be a non-empty string URL.');
    } else {
      req.body.foto_masuk_url = foto_masuk_url.trim();
    }
  }

  if (lapak_id !== undefined) {
    if (typeof lapak_id !== 'string' || !lapak_id.trim()) {
      errors.push('Field "lapak_id" must be a non-empty string ID.');
    } else {
      req.body.lapak_id = lapak_id.trim();
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update attendance request.', errors));
  }

  next();
}

module.exports = {
  validateClockIn,
  validateUpdateAbsensi,
};
