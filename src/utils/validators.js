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

module.exports = {
  isValidEmail,
  isValidPhone,
};
