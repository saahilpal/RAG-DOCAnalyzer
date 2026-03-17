const env = require('./env');

function write(level, message, meta = null) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (!env.isProduction || level !== 'debug') {
    console.log(line);
  }
}

function info(message, meta) {
  write('info', message, meta);
}

function error(message, meta) {
  write('error', message, meta);
}

function debug(message, meta) {
  write('debug', message, meta);
}

module.exports = {
  info,
  error,
  debug,
};
