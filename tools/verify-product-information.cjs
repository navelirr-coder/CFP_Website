const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { products } = require('./build-product-catalogue.cjs');
const frontend = path.resolve(__dirname, '../frontend');
const html = fs.readFileSync(path.join(frontend, 'shop.html'), 'utf8');
const source = fs.readFileSync(path.join(frontend, 'script.js'), 'utf8');
const baseline = execFileSync('git', ['show', 'HEAD:frontend/shop.html'], { encoding: 'utf8' });
const baselineData = execFileSync('git', ['show', 'HEAD:frontend/product-information-data.js'], { encoding: 'utf8' });
assert.equal(fs.readFileSync(path.join(frontend, 'product-information-data.js'), 'utf8').replace(/\r\n/g, '\n'), baselineData.replace(/\r\n/g, '\n'), 'All supplied nutrition and ingredient source data preserved');
const cardsIn = text => [...text.matchAll(/<article class="product-item-card"[^>]*data-product="([^"]+)"[\s\S]*?<\/article>/g)];
const cards = cardsIn(html);
assert.deepEqual(cards.map(match => match[1]), cardsIn(baseline).map(match => match[1]), 'All ten products remain in their original order');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let totalRows = 0;
for (const [index, match] of cards.entries()) {
  const card = match[0], slug = match[1], original = cardsIn(baseline)[index][0];
  assert.deepEqual([...card.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]), [...original.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m => m[1]), `${slug}: original artwork`);
  if (!products[slug]) continue;
  const product = products[slug];
  assert.ok(card.indexOf('class="product-preview"') < card.indexOf('class="product-information"'), 'Preview precedes details');
  assert.ok(card.includes(`<span class="product-number">0${index % 4 + 1}</span>`));
  for (const value of [product.name, product.highlight, product.description, product.ingredients]) assert.ok(card.includes(esc(value)), `${slug}: complete supplied content`);
  assert.match(card, /class="product-information"[^>]* hidden>/, 'Details start hidden');
  assert.ok(card.indexOf('class="product-order-actions"') < card.indexOf('class="product-information"'), 'Order controls remain outside the hidden details');
  assert.match(card, /class="packet-quantity"[^>]*min="0"[^>]*value="0"/);
  for (const row of product.nutrition) {
    assert.ok(card.includes(`<th scope="row">${esc(row.nutrient)}</th><td>${esc(row.per100g ?? 'Not provided')}</td><td>${esc(row.perServing ?? 'Not provided')}</td>`));
  }
  totalRows += product.nutrition.length;
  const href = card.match(/class="btn btn-primary product-order-link" href="([^"]+)"/)[1].replace(/&amp;/g, '&');
  const url = new URL(href);
  assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/919960725539');
  const displayedName = card.match(/class="product-title-link product-details-toggle"[^>]*>([^<]+)/)[1];
  assert.ok(url.searchParams.get('text').includes(displayedName), `${slug}: WhatsApp uses the displayed product name`);
}
assert.equal(totalRows, 82);
function fake(attributes = {}) {
  const classes = new Set();
  return { attributes, style: {}, listeners: {}, classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); }, remove(name) { classes.delete(name); }, contains: name => classes.has(name), add: name => classes.add(name) }, getAttribute: name => attributes[name], setAttribute(name, value) { attributes[name] = value; }, addEventListener(name, fn) { this.listeners[name] = fn; }, querySelector() { return null; } };
}
const fakeCards = cards.map(match => fake({ 'data-category': match[0].match(/data-category="([^"]+)"/)[1] }));
const pills = ['crunchies', 'bites', 'turmeric'].map(cat => fake({ 'data-category': cat }));
const title = {}, count = {}, grid = fake(), back = fake();
const context = { URLSearchParams, window: { location: { search: '?category=bites', hash: '' }, scrollTo() {} }, document: { querySelectorAll: selector => selector === '.category-pill-btn' ? pills : fakeCards, getElementById: id => ({ goingBackBtn: back, currentCategoryTitle: title, currentCategoryCount: count, shopProductsGrid: grid })[id] || null } };
const category = source.slice(source.indexOf('  const categoryPills ='), source.indexOf('     4B. PRODUCT CARD HOVER POP ANIMATION'));
vm.runInNewContext(category.slice(0, category.lastIndexOf('  /*')), context);
assert.equal(title.textContent, 'BITES'); assert.equal(count.textContent, '4 Products');
for (const [i, name] of ['crunchies', 'bites', 'turmeric'].entries()) {
  pills[i].listeners.click();
  assert.equal(grid.attributes['data-category'], name);
  assert.equal(fakeCards.filter(card => card.style.display === 'flex').length, name === 'turmeric' ? 2 : 4);
  assert.ok(fakeCards.filter(card => card.style.display === 'flex').every(card => card.attributes['data-category'] === name));
}
assert.match(source, /card\.addEventListener\('mouseenter'/);
assert.match(source, /card\.classList\.add\('is-popped'\)/);
assert.match(fs.readFileSync(path.join(frontend, 'style.css'), 'utf8'), /@keyframes popOvershootSequence/);
console.log('PASS: original product order/artwork, all eight descriptions and ingredients, 82 exact nutrient rows, initially hidden details, permanent order controls and category navigation.');
