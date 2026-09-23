/**
 * Async Controller Wrapper
 * Catches rejected promises and forwards to global error handler.
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
