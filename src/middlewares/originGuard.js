const env = require('../config/env');
const { fail } = require('../utils/apiResponse');

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function getOriginFromReferer(refererHeader) {
  if (!refererHeader) {
    return null;
  }

  try {
    const parsed = new URL(refererHeader);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function enforceOriginForMutations(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const originHeader = req.get('origin');
  const refererOrigin = getOriginFromReferer(req.get('referer'));
  const requestOrigin = originHeader || refererOrigin;
  const usingAuthCookie = Boolean(req.cookies?.[env.authCookieName]);

  if (!requestOrigin) {
    if (usingAuthCookie) {
      return fail(res, 403, 'ORIGIN_REQUIRED', 'Origin or referer is required for authenticated requests.');
    }

    return next();
  }

  const isAllowed = allowedOrigins.some((allowedOrigin) => {
    if (requestOrigin === allowedOrigin) return true;

    if (
      allowedOrigin.includes('vercel.app') &&
      requestOrigin.endsWith('.vercel.app')
    ) {
      return true;
    }

    return false;
  });

  if (!isAllowed) {
    return fail(res, 403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed for this environment.');
  }

  return next();
}

module.exports = {
  enforceOriginForMutations,
};
