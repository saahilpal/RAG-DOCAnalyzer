const { fail } = require('../utils/apiResponse');

function notFound(_req, res) {
  return fail(res, 404, 'NOT_FOUND', 'Endpoint not found.');
}

module.exports = {
  notFound,
};
