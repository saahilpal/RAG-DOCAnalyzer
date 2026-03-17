const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const logger = require('../config/logger');
const db = require('../database/client');
const { uploadAndIndexDocument } = require('./documentService');

const seedPromises = new Map();

function resolveSamplePath() {
  if (path.isAbsolute(env.sampleDocPath)) {
    return env.sampleDocPath;
  }

  return path.resolve(process.cwd(), env.sampleDocPath);
}

async function markSampleSeeded(userId) {
  await db.query('UPDATE users SET sample_seeded_at = COALESCE(sample_seeded_at, NOW()) WHERE id = $1', [userId]);
}

async function ensureSampleDocumentForUser(userId) {
  if (!env.enableSampleDocSeed) {
    return;
  }

  const userStateResult = await db.query(
    'SELECT id, sample_seeded_at FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );

  if (userStateResult.rowCount === 0) {
    return;
  }

  if (userStateResult.rows[0]?.sample_seeded_at) {
    return;
  }

  const existingCount = await db.query('SELECT COUNT(*)::int AS count FROM documents WHERE user_id = $1', [userId]);
  const count = existingCount.rows[0]?.count || 0;

  if (count > 0) {
    await markSampleSeeded(userId);
    return;
  }

  const samplePath = resolveSamplePath();

  try {
    const buffer = await fs.readFile(samplePath);

    await uploadAndIndexDocument({
      userId,
      file: {
        originalname: 'system_design_primer.pdf',
        mimetype: 'application/pdf',
        buffer,
        size: buffer.length,
      },
      source: 'sample',
      bypassDocumentLimit: true,
    });

    await markSampleSeeded(userId);
  } catch (error) {
    logger.error('Failed to seed sample document', {
      userId,
      samplePath,
      message: error?.message,
    });
  }
}

function ensureSampleDocumentForUserLazy(userId) {
  const key = String(userId);

  if (seedPromises.has(key)) {
    return seedPromises.get(key);
  }

  const task = ensureSampleDocumentForUser(userId).finally(() => {
    seedPromises.delete(key);
  });

  seedPromises.set(key, task);
  return task;
}

module.exports = {
  ensureSampleDocumentForUserLazy,
};
