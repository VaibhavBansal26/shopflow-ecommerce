const { logger } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'A record with this value already exists.';
  } else if (err.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired.';
  }

  if (statusCode >= 500) {
    logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { AppError, errorHandler };
