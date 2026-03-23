const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { closePool } = require('./database/client');
const { startDocumentWorker, stopDocumentWorker } = require('./services/documentWorkerService');

const server = app.listen(env.port, env.host, () => {
  console.log('Firebase initialized:', process.env.FIREBASE_PROJECT_ID);
  logger.info('Server started', {
    host: env.host,
    port: env.port,
    env: env.nodeEnv,
  });
  logger.info(`Using Gemini model: ${env.geminiModel}`);
  logger.info(`Using Gemini embedding model: ${env.geminiEmbeddingModel}`, {
    embeddingDimension: env.embeddingDimension,
  });
  logger.info('Using Firebase project', {
    projectId: env.firebase.projectId,
  });

  if (env.enableDocumentWorker) {
    startDocumentWorker();
  }
});

async function shutdown(signal) {
  logger.info('Shutting down', { signal });

  stopDocumentWorker();

  server.close(async () => {
    await closePool();
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.error('Shutdown error', { message: error.message });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.error('Shutdown error', { message: error.message });
    process.exit(1);
  });
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', {
    message: error?.message || String(error),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error?.message || String(error),
    stack: error?.stack,
  });
});
