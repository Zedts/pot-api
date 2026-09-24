const { ROLES } = require('./roles');

/**
 * Granular Permission Matrix for Resources and Operations
 * Maps resources and operations to arrays of permitted roles.
 * Modify access permissions centrally here without changing route definitions or controllers.
 */
const PERMISSIONS = Object.freeze({
  USER: {
    READ: Object.freeze([ROLES.ADMIN]),
    UPDATE_ROLE: Object.freeze([ROLES.ADMIN]),
    DELETE: Object.freeze([ROLES.ADMIN]),
  },
  LAPAK: {
    CREATE: Object.freeze([ROLES.ADMIN]),
    READ: Object.freeze([ROLES.ADMIN]),
    UPDATE: Object.freeze([ROLES.ADMIN]),
    DELETE: Object.freeze([ROLES.ADMIN]),
  },
  PRODUK: {
    CREATE: Object.freeze([ROLES.ADMIN]),
    READ: Object.freeze([ROLES.ADMIN]),
    UPDATE: Object.freeze([ROLES.ADMIN]),
    DELETE: Object.freeze([ROLES.ADMIN]),
  },
  KATEGORI: {
    CREATE: Object.freeze([ROLES.ADMIN]),
    READ: Object.freeze([ROLES.ADMIN]),
    UPDATE: Object.freeze([ROLES.ADMIN]),
    DELETE: Object.freeze([ROLES.ADMIN]),
  },
});

module.exports = {
  PERMISSIONS,
};
