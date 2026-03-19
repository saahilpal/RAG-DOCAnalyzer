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
    process.stderr.write(`${line}\n`);
    return;
  }

  if (!env.isProduction || level !== 'debug') {
    process.stdout.write(`${line}\n`);
  }
}

function info(message, meta) {
  write('info', message, meta);
}

function warn(message, meta) {
  write('warn', message, meta);
}

function error(message, meta) {
  write('error', message, meta);
}

function debug(message, meta) {
  write('debug', message, meta);
}

module.exports = {
  info,
  warn,
  error,
  debug,
};
