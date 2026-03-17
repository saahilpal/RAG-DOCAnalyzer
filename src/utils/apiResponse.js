function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    data,
  });
}

function fail(res, statusCode, code, message, details = null) {
  return res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = {
  ok,
  fail,
};
