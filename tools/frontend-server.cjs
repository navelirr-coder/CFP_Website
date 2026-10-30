// Optional preview of the static files. No dependencies, API or database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../frontend');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
function createFrontendServer() {
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    try {
      const pathname = decodeURIComponent(req.url.split('?')[0]);
      const segments = pathname.split(/[\\/]/);
      if (segments.some(part => part.startsWith('.') || part.includes(':')) || pathname.includes('\0')) {
        res.writeHead(404); res.end(); return;
      }
      const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!filename.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
      const stat = await fs.promises.stat(filename);
      if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(filename).on('error', () => res.destroy()).pipe(res);
    } catch (error) { res.writeHead(error instanceof URIError ? 400 : 404); res.end(); }
  });
}
if (require.main === module) {
  const port = Number(process.env.FRONTEND_PORT || 5173);
  createFrontendServer().listen(port, '127.0.0.1', () => console.log(`CFP static preview: http://localhost:${port}`));
}
module.exports = { createFrontendServer };
