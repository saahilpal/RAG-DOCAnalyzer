function initSse(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sendEvent(res, event, data) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);
  res.write(`data: ${serialized}\n\n`);
}

function endSse(res) {
  res.write('event: end\n');
  res.write('data: {}\n\n');
  res.end();
}

module.exports = {
  initSse,
  sendEvent,
  endSse,
};
