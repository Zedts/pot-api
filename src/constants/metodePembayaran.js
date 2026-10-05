/**
 * Payment method constants for sales transactions
 */
const METODE_PEMBAYARAN = Object.freeze({
  TUNAI: 'tunai',
  QRIS: 'qris',
  TRANSFER: 'transfer',
});

const VALID_METODE_PEMBAYARAN = Object.freeze(Object.values(METODE_PEMBAYARAN));

module.exports = {
  METODE_PEMBAYARAN,
  VALID_METODE_PEMBAYARAN,
};
