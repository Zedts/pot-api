const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');
const { PERMISSIONS } = require('../constants/permissions');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if authenticated user has one of the explicitly allowed roles.
 * @param  {...string} allowedRoles
 */
function authorize(...allowedRoles) {
  const flattened = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before authorization check.'));
    }

    if (!flattened.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: You do not have permission to perform this action. Required role: ${flattened.join(' or ')}.`
        )
      );
    }

    next();
  };
}

/**
 * Granular Permission-Based Authorization Middleware
 * Resolves allowed roles dynamically from PERMISSIONS[resource][action].
 * Allows central permission configuration updates without touching routes or controllers.
 * @param {string} resource e.g. 'LAPAK', 'PRODUK', 'USER'
 * @param {string} action e.g. 'CREATE', 'READ', 'UPDATE', 'DELETE', 'UPDATE_ROLE'
 */
function authorizePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before authorization check.'));
    }

    const allowedRoles = PERMISSIONS[resource]?.[action] || [];
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: You do not have permission to perform '${action}' on '${resource.toLowerCase()}'. Required role: ${allowedRoles.join(' or ')}.`
        )
      );
    }

    next();
  };
}

module.exports = {
  authorize,
  authorizePermission,
};
