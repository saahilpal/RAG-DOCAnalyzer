const { badRequest } = require('./errors');

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]+/g, ' ')
    .trim();
}

function chunkText(text, chunkSizeTokens, overlapTokens) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (chunkSizeTokens <= 0) {
    throw badRequest('chunkSizeTokens must be greater than 0.');
  }

  if (overlapTokens >= chunkSizeTokens) {
    throw badRequest('chunkOverlapTokens must be smaller than chunkSizeTokens.');
  }

  const chunks = [];
  const step = chunkSizeTokens - overlapTokens;

  for (let start = 0, chunkIndex = 0; start < tokens.length; start += step, chunkIndex += 1) {
    const end = Math.min(start + chunkSizeTokens, tokens.length);
    const content = tokens.slice(start, end).join(' ').trim();

    if (content) {
      chunks.push({
        chunkIndex,
        content,
      });
    }

    if (end >= tokens.length) {
      break;
    }
  }

  return chunks;
}

module.exports = {
  chunkText,
};
