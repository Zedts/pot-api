const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if authenticated user has one of the allowed roles.
 * @param  {...string} allowedRoles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before authorization check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: You do not have permission to perform this action. Required role: ${allowedRoles.join(' or ')}.`
        )
      );
    }

    next();
  };
}

module.exports = authorize;
