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

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for create lapak request.', errors));
  }

  next();
}

/**
 * Middleware: Validate lapak update payload
 */
function validateUpdateLapak(req, res, next) {
  const { nama, lokasi, keterangan, spg_id, latitude, longitude, radius_meter } = req.body;
  const errors = [];

  if (
    nama === undefined &&
    lokasi === undefined &&
    keterangan === undefined &&
    spg_id === undefined &&
    latitude === undefined &&
    longitude === undefined &&
    radius_meter === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (nama, lokasi, keterangan, spg_id, latitude, longitude, radius_meter) must be provided for update.'
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

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update lapak request.', errors));
  }

  next();
}

module.exports = {
  validateCreateLapak,
  validateUpdateLapak,
};
