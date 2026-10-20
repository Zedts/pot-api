/**
 * Shift Constants
 * Centralized enumeration and standard operational shift hours for POT.
 */

const SHIFTS = Object.freeze({
  PAGI: 'pagi',
  SIANG: 'siang',
  LONG: 'long_shift',
});

const VALID_SHIFTS = Object.freeze(Object.values(SHIFTS));

const DEFAULT_SHIFT_HOURS = Object.freeze({
  [SHIFTS.PAGI]: Object.freeze(['08:00', '16:00']),
  [SHIFTS.SIANG]: Object.freeze(['13:00', '21:00']),
  [SHIFTS.LONG]: Object.freeze(['08:00', '20:00']),
});

const EARLY_CLOCK_IN_WINDOW_MINUTES = 180;

/**
 * Normalizes input shift string into canonical shift identifier.
 * Accepts 'pagi', 'siang', 'long_shift', 'long shift', 'long'.
 * @param {string|null|undefined} shift
 * @returns {'pagi'|'siang'|'long_shift'|null}
 */
function normalizeShift(shift) {
  if (!shift || typeof shift !== 'string') return null;
  const s = shift.toLowerCase().trim();
  if (s === SHIFTS.PAGI) return SHIFTS.PAGI;
  if (s === SHIFTS.SIANG) return SHIFTS.SIANG;
  if (s === SHIFTS.LONG || s === 'long shift' || s === 'long') return SHIFTS.LONG;
  return null;
}

module.exports = {
  SHIFTS,
  VALID_SHIFTS,
  DEFAULT_SHIFT_HOURS,
  EARLY_CLOCK_IN_WINDOW_MINUTES,
  normalizeShift,
};

