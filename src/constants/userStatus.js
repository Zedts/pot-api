/**
 * User Account Status Enum
 */
const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const VALID_USER_STATUSES = Object.freeze(Object.values(USER_STATUS));

module.exports = {
  USER_STATUS,
  VALID_USER_STATUSES,
};
