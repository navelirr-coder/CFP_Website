// Optional frontend preview. This process never starts the backend.
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { createRequire } = require('node:module');
const express = createRequire(path.resolve(__dirname, '../backend/package.json'))('express');

function createFrontendApp(backendUrl = 'http://127.0.0.1:3000') {
  const target = new URL(backendUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('BACKEND_URL must be an HTTP(S) origin without embedded credentials.');
  }
  const app = express();
  // Forward same-origin browser API requests, cookies and SSE streams to the separate backend.
  app.use('/api', (req, res) => {
    const incoming = new URL(req.originalUrl, 'http://frontend.invalid');
    const destination = new URL(target.origin);
    destination.pathname = incoming.pathname;
    destination.search = incoming.search;
    const transport = destination.protocol === 'https:' ? https : http;
    const upstream = transport.request(destination, {
      method: req.method,
      headers: { ...req.headers, host: destination.host }
    }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (res.headersSent) { res.destroy(); return; }
      res.status(502).json({ success: false, error: 'The backend is not running. Start it separately with npm start.' });
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
  app.use(express.static(path.resolve(__dirname, '../frontend'), { extensions: ['html', 'htm'] }));
  return app;
}

if (require.main === module) {
  const port = Number(process.env.FRONTEND_PORT || 5173);
  const app = createFrontendApp(process.env.BACKEND_URL || 'http://127.0.0.1:3000');
  app.listen(port, '127.0.0.1', () => {
    console.log(`CFP frontend preview: http://localhost:${port}`);
    console.log('The backend runs independently; this command does not start it.');
  });
}
module.exports = { createFrontendApp };
