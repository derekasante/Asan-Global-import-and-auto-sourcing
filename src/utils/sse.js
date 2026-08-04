function initSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sendSSE(res, eventType, data) {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function keepAlive(res, intervalMs = 25000) {
  const timer = setInterval(() => {
    res.write(': keepalive\n\n');
  }, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { initSSE, sendSSE, keepAlive };
