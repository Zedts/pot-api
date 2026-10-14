/**
 * Shift Constants
 * Centralized enumeration and standard operational shift hours for POT.
 */

const SHIFTS = Object.freeze({
  PAGI: 'pagi',
  SIANG: 'siang',
});

const VALID_SHIFTS = Object.freeze(Object.values(SHIFTS));

const DEFAULT_SHIFT_HOURS = Object.freeze({
  [SHIFTS.PAGI]: Object.freeze(['08:00', '16:00']),
  [SHIFTS.SIANG]: Object.freeze(['13:00', '21:00']),
});

module.exports = {
  SHIFTS,
  VALID_SHIFTS,
  DEFAULT_SHIFT_HOURS,
};
