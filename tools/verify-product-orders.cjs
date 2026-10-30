const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { packetCount, orderUrl } = require('../frontend/product-orders.js');
const script = fs.readFileSync(path.resolve(__dirname, '../frontend/product-orders.js'), 'utf8');
for (const [value, expected] of [['', 0], ['-2', 0], ['2.9', 2], ['abc', 0], [Infinity, 0], ['3', 3]]) assert.equal(packetCount(value), expected);
function element() {
  return { handlers: {}, attributes: {}, value: '0', textContent: '', hidden: false,
    addEventListener(name, fn) { this.handlers[name] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    contains() { return false; }, focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; }
  };
}
function setup(hover = true, hash = '') {
  const names = ['Ragi Sticks', 'Bajra Chivda', 'Jowar Chips', 'Jowar Chivda', 'Ragi Ladoo', 'Millet Ladoo', 'Millet Cookies', 'Millet Nutri Bar'];
  const cards = names.map((name, index) => {
    const nodes = {};
    for (const selector of ['.product-title-link', '.packet-quantity', '.packet-minus', '.packet-plus', '.product-order-link', '.product-preview', '.product-information', '.product-details-toggle', '.product-information-close']) nodes[selector] = element();
    nodes['.product-title-link'].textContent = name;
    nodes['.product-information'].id = `details-${index}`;
    const card = element(); card.querySelector = selector => nodes[selector]; card.nodes = nodes; return card;
  });
  const status = element();
  const window = { matchMedia: () => ({ matches: hover }), location: { hash }, addEventListener() {} };
  vm.runInNewContext(script, { Number, encodeURIComponent, window, document: {
    querySelectorAll: () => cards, getElementById: () => status, addEventListener: (_, fn) => fn()
  } });
  const node = (i, selector) => cards[i].nodes[selector];
  const click = (i, selector) => node(i, selector).handlers.click();
  const draft = i => new URL(node(i, '.product-order-link').href).searchParams.get('text');
  return { cards, node, click, draft, status };
}
const app = setup();
app.cards.forEach((_, i) => { assert.equal(app.node(i, '.product-information').hidden, true); assert.equal(app.node(i, '.packet-minus').disabled, true); });
// Select out of order, including a hidden category. The message follows catalogue order.
app.click(5, '.packet-plus'); app.click(5, '.packet-plus'); app.click(2, '.packet-plus'); app.click(0, '.packet-plus');
app.click(0, '.packet-plus'); app.click(0, '.packet-plus');
const draft = app.draft(5);
assert.match(draft, /1\. "Ragi Sticks" — 3 packets\n2\. "Jowar Chips" — 1 packet\n3\. "Millet Ladoo" — 2 packets/);
assert.doesNotMatch(draft, /Bajra Chivda|Millet Cookies/);
assert.equal(new URL(app.node(5, '.product-order-link').href).pathname, '/919960725539');
app.click(2, '.packet-minus'); assert.doesNotMatch(app.draft(5), /Jowar Chips/);
app.click(2, '.packet-minus'); assert.equal(app.node(2, '.packet-quantity').value, '0');
app.node(5, '.packet-quantity').value = '7'; app.node(5, '.packet-quantity').handlers.input(); assert.match(app.draft(0), /"Millet Ladoo" — 7 packets/);
// Clicking an unset product adds one packet and keeps all other selections.
app.click(6, '.product-order-link'); assert.equal(app.node(6, '.packet-quantity').value, '1'); assert.match(app.draft(6), /"Millet Cookies" — 1 packet/);
const first = app.cards[0], info = app.node(0, '.product-information');
first.handlers.mouseenter(); assert.equal(info.hidden, false);
first.handlers.mouseleave(); assert.equal(info.hidden, true);
app.click(0, '.product-details-toggle'); first.handlers.mouseleave(); assert.equal(info.hidden, false, 'Clicked details stay open');
app.click(0, '.product-details-toggle'); assert.equal(info.hidden, true);
app.click(0, '.product-details-toggle'); app.click(0, '.product-information-close'); assert.equal(info.hidden, true);
app.click(0, '.product-details-toggle'); first.handlers.keydown({ key: 'Escape', preventDefault() {} }); assert.equal(info.hidden, true);
const touch = setup(false); touch.cards[0].handlers.mouseenter(); assert.equal(touch.node(0, '.product-information').hidden, true);
touch.click(0, '.product-details-toggle'); assert.equal(touch.node(0, '.product-information').hidden, false);
const linked = setup(false, '#details-7'); assert.equal(linked.node(7, '.product-information').hidden, false); assert.equal(linked.node(7, '.product-information').scrolled, true);
assert.match(new URL(orderUrl([{ name: 'Test & product', quantity: 4 }])).searchParams.get('text'), /"Test & product" — 4 packets/);
console.log('PASS: hover/click/touch/Escape details, zero and editable packet quantities, mixed-category order drafts in catalogue order, unset-product ordering and deep links.');
