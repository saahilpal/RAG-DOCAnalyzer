const multer = require('multer');
const { fail } = require('../utils/apiResponse');
const { AppError } = require('../utils/errors');
const logger = require('../config/logger');

function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return;
  }

  if (err instanceof multer.MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file exceeds maximum size limit.'
        : err.message || 'Upload failed.';

    return fail(res, 400, code, message);
  }

  if (err instanceof AppError) {
    return fail(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err?.type === 'entity.parse.failed') {
    return fail(res, 400, 'INVALID_JSON', 'Invalid JSON payload.');
  }

  logger.error('Unhandled application error', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });

  return fail(res, 500, 'INTERNAL_ERROR', 'Internal server error.');
}

module.exports = {
  errorHandler,
};
