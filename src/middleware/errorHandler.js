// src/middleware/errorHandler.js
// Centralized Express error handler shielding internal database errors and stack traces

function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.error('Unhandled Application Error:', err);
  } else {
    console.error('Application Error:', err.message);
  }

  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const clientMessage = statusCode === 500
    ? 'An unexpected error occurred while processing your request. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    ...(isDev && statusCode === 500 ? { devDetails: err.message, stack: err.stack } : {})
  });
}

module.exports = errorHandler;
