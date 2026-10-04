/**
 * User Roles Enum
 * Strictly restricted to 6 roles: ADMIN, OWNER, PRODUKSI, VIAR, SPG, and UNASSIGNED.
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  OWNER: 'owner',
  PRODUKSI: 'produksi',
  VIAR: 'viar',
  SPG: 'spg',
  UNASSIGNED: 'unassigned',
});

const VALID_ROLES = Object.freeze(Object.values(ROLES));

const ADMIN_ROLES = Object.freeze([ROLES.ADMIN, ROLES.OWNER]);

module.exports = {
  ROLES,
  VALID_ROLES,
  ADMIN_ROLES,
};
