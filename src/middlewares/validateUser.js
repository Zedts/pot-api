const { VALID_ROLES } = require('../constants/roles');
const { VALID_USER_STATUSES } = require('../constants/userStatus');
const { BadRequestError } = require('../errors/AppError');
const { isValidPhone } = require('../utils/validators');

/**
 * Middleware: Validate user update payload
 */
function validateUpdateUser(req, res, next) {
  const { nama, role, no_hp, password, status } = req.body;
  const errors = [];

  if (
    nama === undefined &&
    role === undefined &&
    no_hp === undefined &&
    password === undefined &&
    status === undefined
  ) {
    return next(
      new BadRequestError(
        'At least one field (nama, role, no_hp, password, status) must be provided for update.'
      )
    );
  }

  if (nama !== undefined && (typeof nama !== 'string' || nama.trim().length < 2)) {
    errors.push('Field "nama" must be at least 2 characters long.');
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || !VALID_ROLES.includes(role.toLowerCase().trim())) {
      errors.push(`Invalid role "${role}". Allowed roles are strictly: ${VALID_ROLES.join(', ')}.`);
    } else {
      req.body.role = role.toLowerCase().trim();
    }
  }

  if (no_hp !== undefined && !isValidPhone(no_hp)) {
    errors.push('Field "no_hp" must be a valid phone number (8-15 digits).');
  }

  if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
    errors.push('Field "password" must be at least 6 characters long.');
  }

  if (status !== undefined) {
    if (typeof status !== 'string' || !VALID_USER_STATUSES.includes(status.toLowerCase().trim())) {
      errors.push(`Invalid status "${status}". Allowed values: ${VALID_USER_STATUSES.join(', ')}.`);
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

module.exports = {
  validateUpdateUser,
  validateUpdateRole,
};
