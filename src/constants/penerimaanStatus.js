/**
 * Penerimaan (Receipt) Status Enum
 */
const PENERIMAAN_STATUS = Object.freeze({
  SESUAI: 'sesuai',
  SELISIH: 'selisih',
});

const VALID_PENERIMAAN_STATUSES = Object.freeze(Object.values(PENERIMAAN_STATUS));

module.exports = {
  PENERIMAAN_STATUS,
  VALID_PENERIMAAN_STATUSES,
};
