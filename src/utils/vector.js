const { badRequest } = require('./errors');

function toVectorLiteral(values, expectedDimension) {
  if (!Array.isArray(values) || values.length !== expectedDimension) {
    throw badRequest(`Embedding dimension mismatch. Expected ${expectedDimension}.`);
  }

  const cleaned = values.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw badRequest('Embedding contains non-numeric values.');
    }
    return numeric;
  });

  return `[${cleaned.join(',')}]`;
}

module.exports = {
  toVectorLiteral,
};
