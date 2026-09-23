/**
 * User Roles Enum
 * Strictly restricted to ADMIN and USER.
 */
const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
});

const VALID_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  VALID_ROLES,
};
