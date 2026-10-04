const { VALID_ROLES } = require('../constants/roles');
const { VALID_STATUSES } = require('../constants/status');
const { BadRequestError } = require('../errors/AppError');
const { isValidPhone, isValidEmail } = require('../utils/validators');

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Middleware: Validate user update payload
 */
function validateUpdateUser(req, res, next) {
  const { nama, username, email, role, lapak_id, no_hp, password, status } = req.body;
  const errors = [];

  if (
    nama === undefined &&
    username === undefined &&
    email === undefined &&
    role === undefined &&
    lapak_id === undefined &&
    no_hp === undefined &&
    password === undefined &&
    status === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (nama, username, email, role, lapak_id, no_hp, password, status) must be provided for update.'
      )
    );
  }

  if (nama !== undefined && (typeof nama !== 'string' || nama.trim().length < 2)) {
    errors.push('Field "nama" must be at least 2 characters long.');
  }

  if (username !== undefined) {
    if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
      errors.push('Field "username" must be 3-30 characters containing only letters, numbers, and underscores.');
    } else {
      req.body.username = username.trim();
    }
  }

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      errors.push('Field "email" must be a valid email address.');
    } else {
      req.body.email = email.toLowerCase().trim();
    }
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || !VALID_ROLES.includes(role.toLowerCase().trim())) {
      errors.push(`Invalid role "${role}". Allowed roles are strictly: ${VALID_ROLES.join(', ')}.`);
    } else {
      req.body.role = role.toLowerCase().trim();
    }
  }

  if (lapak_id !== undefined && lapak_id !== null) {
    if (typeof lapak_id !== 'string' || !lapak_id.trim()) {
      errors.push('Field "lapak_id" must be a valid string ID or null.');
    } else {
      req.body.lapak_id = lapak_id.trim();
    }
  }

  if (no_hp !== undefined && !isValidPhone(no_hp)) {
    errors.push('Field "no_hp" must be a valid phone number (8-15 digits).');
  }

  if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
    errors.push('Field "password" must be at least 6 characters long.');
  }

  if (status !== undefined) {
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status.toLowerCase().trim())) {
      errors.push(`Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}.`);
    } else {
      req.body.status = status.toLowerCase().trim();
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for update user request.', errors));
  }

  next();
}

/**
 * Middleware: Validate user role update payload (Admin dedicated endpoint)
 */
function validateUpdateRole(req, res, next) {
  const { role } = req.body;

  if (!role || typeof role !== 'string') {
    return next(new BadRequestError('Field "role" is required and must be a string.'));
  }

  const normalizedRole = role.toLowerCase().trim();
  if (!VALID_ROLES.includes(normalizedRole)) {
    return next(
      new BadRequestError(
        `Invalid role "${role}". Allowed roles are strictly: ${VALID_ROLES.join(', ')}.`
      )
    );
  }

  req.body.role = normalizedRole;
  next();
}

/**
 * Middleware: Validate user lapak assignment payload (Admin/Owner dedicated endpoint)
 */
function validateUpdateUserLapak(req, res, next) {
  const { lapak_id } = req.body;

  if (lapak_id === undefined) {
    return next(new BadRequestError('Field "lapak_id" is required (string document ID or null to unassign).'));
  }

  if (lapak_id !== null && (typeof lapak_id !== 'string' || !lapak_id.trim())) {
    return next(new BadRequestError('Field "lapak_id" must be a valid non-empty string or null.'));
  }

  if (typeof lapak_id === 'string') {
    req.body.lapak_id = lapak_id.trim();
  }

  next();
}

module.exports = {
  validateUpdateUser,
  validateUpdateRole,
  validateUpdateUserLapak,
};
