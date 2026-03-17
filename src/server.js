const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { closePool } = require('./database/client');

const server = app.listen(env.port, env.host, () => {
  logger.info('Server started', {
    host: env.host,
    port: env.port,
    env: env.nodeEnv,
  });
});

async function shutdown(signal) {
  logger.info('Shutting down', { signal });

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
