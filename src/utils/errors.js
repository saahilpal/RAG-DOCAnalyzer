class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details = null) {
  return new AppError(400, 'BAD_REQUEST', message, details);
}

function unauthorized(message = 'Unauthorized') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

function forbidden(message = 'Forbidden') {
  return new AppError(403, 'FORBIDDEN', message);
}

function notFound(message = 'Not found') {
  return new AppError(404, 'NOT_FOUND', message);
}

function conflict(message = 'Conflict') {
  return new AppError(409, 'CONFLICT', message);
}

function internal(message = 'Internal server error', details = null) {
  return new AppError(500, 'INTERNAL_ERROR', message, details);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal,
};
