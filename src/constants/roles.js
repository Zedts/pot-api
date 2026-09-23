/**
 * User Roles Enum
 * Strictly restricted to 5 roles: ADMIN, PRODUKSI, PENGIRIM, SPG, and UNASSIGNED.
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  PRODUKSI: 'produksi',
  PENGIRIM: 'pengirim',
  SPG: 'spg',
  UNASSIGNED: 'unassigned',
});

const VALID_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  VALID_ROLES,
};
