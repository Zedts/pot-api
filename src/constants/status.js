/**
 * Generic Active/Inactive Status Enum
 * Reusable across Users, Produk, etc.
 */
const STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const VALID_STATUSES = Object.freeze(Object.values(STATUS));

module.exports = {
  STATUS,
  VALID_STATUSES,
  // Domain convenience aliases
  // User:
  USER_STATUS: STATUS,
  VALID_USER_STATUSES: VALID_STATUSES,

  // Produk:
  PRODUK_STATUS: STATUS,
  VALID_PRODUK_STATUSES: VALID_STATUSES,
};
