/**
 * Attendance status constants
 */
const ABSENSI_STATUS = Object.freeze({
  HADIR: 'hadir',
  TERLAMBAT: 'terlambat',
  IZIN: 'izin',
});

const VALID_ABSENSI_STATUSES = Object.freeze(Object.values(ABSENSI_STATUS));

module.exports = {
  ABSENSI_STATUS,
  VALID_ABSENSI_STATUSES,
};
