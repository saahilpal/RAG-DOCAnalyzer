const { z } = require('zod');
const { badRequest } = require('../utils/errors');

function validate(schema, source) {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return next(badRequest('Validation failed.', details));
    }

    req[source] = result.data;
    return next();
  };
}

const validateBody = (schema) => validate(schema, 'body');
const validateParams = (schema) => validate(schema, 'params');
const validateQuery = (schema) => validate(schema, 'query');
function validateFile(schema) {
  return function fileValidationMiddleware(req, _res, next) {
    const result = schema.safeParse(req.file);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return next(badRequest('Validation failed.', details));
    }

    req.file = result.data;
    return next();
  };
}

module.exports = {
  z,
  validateBody,
  validateParams,
  validateQuery,
  validateFile,
};
