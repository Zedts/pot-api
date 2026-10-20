const { BadRequestError } = require('../errors/AppError');

/**
 * Helper to validate coordinate and geofence radius fields
 */
function validateCoordinateFields(body, errors) {
  // Validate Latitude (-90 to 90)
  if (body.latitude !== undefined && body.latitude !== null) {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Field "latitude" must be a valid number between -90 and 90.');
    } else {
      body.latitude = lat;
    }
  }

  // Validate Longitude (-180 to 180)
  if (body.longitude !== undefined && body.longitude !== null) {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Field "longitude" must be a valid number between -180 and 180.');
    } else {
      body.longitude = lng;
    }
  }

  // Validate Radius Meter (positive number, min 5m, max 5000m, default 25m)
  if (body.radius_meter !== undefined && body.radius_meter !== null) {
    const radius = Number(body.radius_meter);
    if (isNaN(radius) || radius < 5 || radius > 5000) {
      errors.push('Field "radius_meter" must be a positive number between 5 and 5000 meters.');
    } else {
      body.radius_meter = Math.round(radius);
    }
  }
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateShiftHours(fieldName, value, errors) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.length !== 2) {
    errors.push(`Field "${fieldName}" must be an array of exactly 2 time strings: ["HH:mm", "HH:mm"].`);
    return;
  }
  const [start, end] = value;
  const isStartValid = typeof start === 'string' && TIME_REGEX.test(start.trim());
  const isEndValid = typeof end === 'string' && TIME_REGEX.test(end.trim());

  if (!isStartValid) {
    errors.push(`Start time in "${fieldName}" must be in "HH:mm" 24-hour format (e.g. "08:00").`);
  }
  if (!isEndValid) {
    errors.push(`End time in "${fieldName}" must be in "HH:mm" 24-hour format (e.g. "16:00").`);
  }

  if (isStartValid && isEndValid) {
    const [startH, startM] = start.trim().split(':').map(Number);
    const [endH, endM] = end.trim().split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      errors.push(`Start time ("${start}") must be earlier than end time ("${end}") in "${fieldName}".`);
    }
  }
}

/**
 * Middleware: Validate lapak creation payload
 */
function validateCreateLapak(req, res, next) {
  const { nama, lokasi, keterangan, spg_id } = req.body;
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

  if (spg_id !== undefined && spg_id !== null) {
    if (typeof spg_id !== 'string' || !spg_id.trim()) {
      errors.push('Field "spg_id" must be a valid string ID or null.');
    } else {
      req.body.spg_id = spg_id.trim();
    }
  }

  validateCoordinateFields(req.body, errors);
  validateShiftHours('shift_pagi', req.body.shift_pagi, errors);
  validateShiftHours('shift_siang', req.body.shift_siang, errors);
  validateShiftHours('shift_long', req.body.shift_long, errors);

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create lapak request.', errors));
  }

  next();
}

/**
 * Middleware: Validate lapak update payload
 */
function validateUpdateLapak(req, res, next) {
  const { nama, lokasi, keterangan, spg_id, latitude, longitude, radius_meter, shift_pagi, shift_siang, shift_long } = req.body;
  const errors = [];

  if (
    nama === undefined &&
    lokasi === undefined &&
    keterangan === undefined &&
    spg_id === undefined &&
    latitude === undefined &&
    longitude === undefined &&
    radius_meter === undefined &&
    shift_pagi === undefined &&
    shift_siang === undefined &&
    shift_long === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (nama, lokasi, keterangan, spg_id, latitude, longitude, radius_meter, shift_pagi, shift_siang, shift_long) must be provided for update.'
      )
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

  if (spg_id !== undefined && spg_id !== null) {
    if (typeof spg_id !== 'string' || !spg_id.trim()) {
      errors.push('Field "spg_id" must be a valid string ID or null.');
    } else {
      req.body.spg_id = spg_id.trim();
    }
  }

  validateCoordinateFields(req.body, errors);
  validateShiftHours('shift_pagi', shift_pagi, errors);
  validateShiftHours('shift_siang', shift_siang, errors);
  validateShiftHours('shift_long', shift_long, errors);

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update lapak request.', errors));
  }

  next();
}

/**
 * Middleware: Validate lapak shift hours update payload
 */
function validateUpdateLapakShift(req, res, next) {
  const { shift_pagi, shift_siang, shift_long } = req.body;
  const errors = [];

  if (shift_pagi === undefined && shift_siang === undefined && shift_long === undefined) {
    return next(
      new BadRequestError('At least one field ("shift_pagi", "shift_siang", or "shift_long") must be provided.')
    );
  }

  if (shift_pagi !== undefined) {
    validateShiftHours('shift_pagi', shift_pagi, errors);
  }

  if (shift_siang !== undefined) {
    validateShiftHours('shift_siang', shift_siang, errors);
  }

  if (shift_long !== undefined) {
    validateShiftHours('shift_long', shift_long, errors);
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for lapak shift hours update.', errors));
  }

  next();
}

module.exports = {
  validateCreateLapak,
  validateUpdateLapak,
  validateUpdateLapakShift,
};
