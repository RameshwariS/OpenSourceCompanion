import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognises an error handler by its 4 parameters, so `next` must stay.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    err = new ApiError(400, 'Invalid JSON in request body');
  }

  const statusCode = err.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) console.error(err);

  res.status(statusCode).json({
    success: false,
    // Never leak internal error details to clients in production
    message: isServerError && env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}