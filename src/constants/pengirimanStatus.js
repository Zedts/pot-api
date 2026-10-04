/**
 * Pengiriman (Shipment) Lifecycle Status Enum
 */
const PENGIRIMAN_STATUS = Object.freeze({
  DRAFT: 'draft',
  DIKIRIM_VIAR: 'dikirim_viar',
  DITERIMA_SPG: 'diterima_spg',
  SELESAI: 'selesai',
});

const VALID_PENGIRIMAN_STATUSES = Object.freeze(Object.values(PENGIRIMAN_STATUS));

module.exports = {
  PENGIRIMAN_STATUS,
  VALID_PENGIRIMAN_STATUSES,
};
