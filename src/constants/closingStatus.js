/**
 * Closing Status Constants
 * Valid lifecycle statuses for daily booth financial & inventory reconciliation
 */
const CLOSING_STATUS = Object.freeze({
  PENDING: 'pending',
  TERVERIFIKASI: 'terverifikasi',
  PERLU_REVISI: 'perlu_revisi',
});

const VALID_CLOSING_STATUSES = Object.freeze(Object.values(CLOSING_STATUS));

module.exports = {
  CLOSING_STATUS,
  VALID_CLOSING_STATUSES,
};
