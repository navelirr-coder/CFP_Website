const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createFrontendServer } = require('./frontend-server.cjs');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const removed = ['cart.html', 'checkout.html', 'login.html', 'track-order.html', 'admin.html', 'admin.js', 'admin.css', 'order-history.js'];
assert.equal(fs.existsSync(path.join(root, 'backend')), false, 'Backend directory removed');
removed.forEach(file => assert.equal(fs.existsSync(path.join(frontend, file)), false, file));
const manifest = require('../package.json');
assert.equal(Object.keys(manifest.dependencies || {}).length, 0);
assert.doesNotMatch(JSON.stringify(manifest.scripts), /--prefix backend|migrate|seed:admin/);
const files = fs.readdirSync(frontend).filter(file => /\.(html|css|js)$/.test(file));
for (const file of files) {
  const text = fs.readFileSync(path.join(frontend, file), 'utf8');
  assert.doesNotMatch(text, /(?:cart|checkout|login|track-order|admin)\.html|add-to-cart|addDetailsCartBtn|\/api\/|\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b/i, `${file}: static content only`);
  if (!file.endsWith('.html')) continue;
  for (const match of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/.test(link)) continue;
    const target = decodeURIComponent(link.split(/[?#]/)[0]);
    assert.ok(fs.existsSync(path.resolve(frontend, target)), `${file}: local link exists: ${target}`);
  }
}
assert.match(fs.readFileSync(path.join(frontend, '.htaccess'), 'utf8'), /RewriteCond %\{HTTPS\} off/);
const server = createFrontendServer();
const request = (port, url, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: url, method }, res => {
    const chunks = []; res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  }); req.on('error', reject); req.end();
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    for (const file of ['index.html', 'shop.html', 'style.css', 'assets/documents/gst-registration.pdf', 'assets/catalogues/Bites Catalogue_Digital Copy.pdf']) {
      const response = await request(port, '/' + encodeURI(file));
      assert.equal(response.status, 200, file);
      assert.deepEqual(response.body, fs.readFileSync(path.join(frontend, file)), 'Served bytes match source');
    }
    for (const url of [...removed.map(file => '/' + file), '/api/orders', '/api/auth/login', '/../package.json', '/%2e%2e/package.json', '/.htaccess', '/%2eenv', '/..%5cpackage.json']) {
      assert.equal((await request(port, url)).status, 404, url);
    }
    assert.equal((await request(port, '/shop.html', 'HEAD')).body.length, 0);
    assert.equal((await request(port, '/shop.html', 'POST')).status, 405);
    assert.equal((await request(port, '/%ZZ')).status, 400);
    console.log('PASS: static-only site, complete removal of backend/account/purchasing code, valid local HTML links, HTTPS retained, exact served bytes and preview boundaries.');
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
