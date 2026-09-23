const { BadRequestError } = require('../errors/AppError');
const { isValidEmail, isValidPhone } = require('../utils/validators');

/**
 * Validate registration request payload
 */
function validateRegister(req, res, next) {
  const { nama, email, password, no_hp } = req.body;
  const errors = [];

  if (!nama || typeof nama !== 'string' || nama.trim().length < 2) {
    errors.push('Field "nama" is required and must be at least 2 characters long.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Field "email" is required and must be a valid email address.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Field "password" is required and must be at least 6 characters long.');
  }

  if (no_hp && !isValidPhone(no_hp)) {
    errors.push('Field "no_hp" must be a valid phone number (8-15 digits).');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for registration request.', errors));
  }

  next();
}

/**
 * Validate email/password login request payload
 */
function validateEmailLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Field "email" is required and must be a valid email address.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Field "password" is required for login.');
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for login request.', errors));
  }

  next();
}

/**
 * Validate Google sign-in payload
 */
function validateGoogleLogin(req, res, next) {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    return next(new BadRequestError('Field "idToken" is required for Google Sign-In.'));
  }

  next();
}

module.exports = {
  validateRegister,
  validateEmailLogin,
  validateGoogleLogin,
};
