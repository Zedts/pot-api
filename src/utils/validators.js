/**
 * Shared Validator Utilities
 * Reusable validation functions across authentication and user management.
 */

/**
 * Validates standard email address format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates international/national phone number format (8-15 digits, optional leading +)
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone) return true; // Optional phone numbers pass when omitted
  if (typeof phone !== 'string') return false;
  return /^\+?[0-9]{8,15}$/.test(phone.trim());
}

/**
 * Validates optional date field for Express middleware.
 * Accepts ISO string, YYYY-MM-DD, or Date instance.
 * If omitted, undefined, null, or empty string, it is considered valid (defaults to now).
 * @param {*} tanggal
 * @returns {string|null} Error message if invalid, or null if valid
 */
function validateDateField(tanggal) {
  if (tanggal === undefined || tanggal === null) return null;
  if (typeof tanggal === 'string' && tanggal.trim() === '') return null;
  const parsed = new Date(tanggal);
  if (isNaN(parsed.getTime())) {
    return 'Field "tanggal" must be a valid date or timestamp string.';
  }
  return null;
}

/**
 * Validates and parses an optional date input.
 * Supports ISO timestamps (e.g. "2026-09-29T08:00:00.000Z"), date strings (e.g. "2026-09-30"),
 * Date instances, or defaults to new Date() if omitted / empty.
 * @param {string|Date|null|undefined} dateInput
 * @param {boolean} [defaultToNow=true]
 * @returns {Date|null}
 */
function parseDateOrDefault(dateInput, defaultToNow = true) {
  if (dateInput === undefined || dateInput === null) {
    return defaultToNow ? new Date() : null;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed === '') {
      return defaultToNow ? new Date() : null;
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      const { BadRequestError } = require('../errors/AppError');
      throw new BadRequestError('Field "tanggal" must be a valid date or timestamp string.');
    }
    return parsed;
  }
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      const { BadRequestError } = require('../errors/AppError');
      throw new BadRequestError('Field "tanggal" must be a valid date or timestamp string.');
    }
    return dateInput;
  }
  const { BadRequestError } = require('../errors/AppError');
  throw new BadRequestError('Field "tanggal" must be a valid date or timestamp string.');
}

module.exports = {
  isValidEmail,
  isValidPhone,
  validateDateField,
  parseDateOrDefault,
};
