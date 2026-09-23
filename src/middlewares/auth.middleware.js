const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { UnauthorizedError } = require('../errors/AppError');

/**
 * Authentication Middleware
 * Enforces API access protection: extracts and validates the 30-day Bearer JWT token.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication required. Please provide a Bearer token in the Authorization header.'));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new UnauthorizedError('Server configuration error: JWT_SECRET is missing.'));
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Fetch user from Firestore to ensure the account still exists and is active
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('The user account associated with this token no longer exists.'));
    }

    if (!user.isActive()) {
      return next(new UnauthorizedError('Account is inactive. Please contact support.'));
    }

    // Attach authenticated user to request context
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Your authentication token has expired (30-day limit). Please log in again.'));
    }
    return next(new UnauthorizedError('Invalid authentication token.'));
  }
}

module.exports = authenticate;
