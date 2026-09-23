const { AppError } = require('./AppError');

/**
 * Global Error Handling Middleware
 * Ensures safe, predictable, and professional HTTP error responses.
 */
function errorHandler(err, req, res, next) {
  // Handle JSON body parse errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
      error: 'BadRequest',
    });
  }

  // Handle known operational AppErrors
  if (err instanceof AppError) {
    const response = {
      success: false,
      message: err.message,
      error: err.name,
    };

    if (err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle Firestore grpc errors or specific codes if encountered
  if (err && err.code === 5) {
    return res.status(404).json({
      success: false,
      message: 'Requested document was not found in the database.',
      error: 'NotFound',
    });
  }

  // Log unexpected errors safely on the server side
  console.error('[UNHANDLED_ERROR]:', err);

  // Return generic safe response for unknown errors to prevent information leakage
  return res.status(500).json({
    success: false,
    message: 'An unexpected internal error occurred. Please try again later.',
    error: 'InternalServerError',
  });
}

/**
 * 404 Not Found Middleware for undefined routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found.`,
    error: 'NotFound',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
