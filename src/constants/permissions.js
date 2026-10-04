const { ROLES, ADMIN_ROLES } = require('./roles');

/**
 * Granular Permission Matrix for Resources and Operations
 * Maps resources and operations to arrays of permitted roles.
 * Modify access permissions centrally here without changing route definitions or controllers.
 * Both ADMIN and OWNER share identical full administrative permissions via ADMIN_ROLES.
 */
const PERMISSIONS = Object.freeze({
  USER: {
    READ: ADMIN_ROLES,
    UPDATE_ROLE: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  LAPAK: {
    CREATE: ADMIN_ROLES,
    READ: ADMIN_ROLES,
    UPDATE: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  PRODUK: {
    CREATE: ADMIN_ROLES,
    READ: ADMIN_ROLES,
    UPDATE: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  KATEGORI: {
    CREATE: ADMIN_ROLES,
    READ: ADMIN_ROLES,
    UPDATE: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  SATUAN: {
    CREATE: ADMIN_ROLES,
    READ: Object.freeze([...ADMIN_ROLES, ROLES.PRODUKSI]),
    UPDATE: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  PENGIRIMAN: {
    CREATE: ADMIN_ROLES,
    READ: Object.freeze([...ADMIN_ROLES, ROLES.PRODUKSI, ROLES.VIAR, ROLES.SPG]),
    UPDATE: ADMIN_ROLES,
    UPDATE_STATUS: ADMIN_ROLES,
    DELETE: ADMIN_ROLES,
  },
  PENGIRIMAN_DETAIL: {
    READ: Object.freeze([...ADMIN_ROLES, ROLES.PRODUKSI, ROLES.VIAR, ROLES.SPG]),
  },
});

module.exports = {
  PERMISSIONS,
};
