/**
 * Payroll Status Constants
 * Valid lifecycle statuses for monthly employee salary records
 */
const PAYROLL_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
});

const VALID_PAYROLL_STATUSES = Object.freeze(Object.values(PAYROLL_STATUS));

module.exports = {
  PAYROLL_STATUS,
  VALID_PAYROLL_STATUSES,
};
