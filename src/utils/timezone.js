/**
 * Timezone and Date Utility
 * Provides standardized Indonesian local timezone (Asia/Jakarta, WIB, UTC+7)
 * conversions and formatting across Vercel serverless functions.
 */

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Returns formatted date string 'YYYY-MM-DD' in the given timezone.
 * @param {Date|string|number} [date=new Date()]
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {string} 'YYYY-MM-DD'
 */
function getLocalDateString(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns { hour, minute, second } numbers in the given timezone.
 * @param {Date|string|number} [date=new Date()]
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {{ hour: number, minute: number, second: number }}
 */
function getLocalTimeParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return { hour: 0, minute: 0, second: 0 };
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const parts = formatter.formatToParts(d);
  const result = { hour: 0, minute: 0, second: 0 };
  for (const p of parts) {
    if (p.type === 'hour') result.hour = parseInt(p.value, 10);
    if (p.type === 'minute') result.minute = parseInt(p.value, 10);
    if (p.type === 'second') result.second = parseInt(p.value, 10);
  }
  return result;
}

module.exports = {
  DEFAULT_TIMEZONE,
  getLocalDateString,
  getLocalTimeParts,
};
