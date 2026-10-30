// Rebuild only the eight snack information sections from the supplied content.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../frontend');
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'product-information-data.js'), 'utf8'), scope);
const products = scope.window.CFP_PRODUCT_INFORMATION;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function information(slug) {
  const product = products[slug];
  return `<section class="product-information" id="details-${slug}" aria-labelledby="heading-${slug}" hidden>
              <h3 id="heading-${slug}">${escape(product.name)}</h3>
              <p class="product-information-highlight">${escape(product.highlight)}</p>
              <p class="product-full-description">${escape(product.description)}</p>
              <h4>Ingredients</h4>
              <p class="product-ingredients">${escape(product.ingredients)}</p>
              <h4>Nutritional information</h4>
              <table>
                <caption>Values per 100 g and per ${escape(product.servingSize)} serving</caption>
                <thead><tr><th scope="col">Nutrient</th><th scope="col">Per 100 g</th><th scope="col">Per ${escape(product.servingSize)}</th></tr></thead>
                <tbody>${product.nutrition.map(row => `<tr><th scope="row">${escape(row.nutrient)}</th><td>${escape(row.per100g ?? 'Not provided')}</td><td>${escape(row.perServing ?? 'Not provided')}</td></tr>`).join('\n                  ')}</tbody>
              </table>
              <button class="product-information-close" type="button">Close details ↑</button>
            </section>`;
}
function build(html) {
  const positions = {};
  return html.replace(/\r\n/g, '\n').replace(/<article class="product-item-card"[^>]*data-product="([^"]+)"[\s\S]*?<\/article>/g, (card, slug) => {
    if (!products[slug]) return card;
    const category = products[slug].category;
    const number = positions[category] = (positions[category] || 0) + 1;
    card = card.replace(/<span class="product-number">.*?<\/span>/, '');
    card = card.replace('<div class="product-preview">', `<div class="product-preview"><span class="product-number">0${number}</span>`);
    card = card.replace(/(<p class="product-short-desc">)[\s\S]*?(<\/p>)/, `$1${escape(products[slug].shortDescription)}$2`);
    card = card.replace(/\s*<!-- PRODUCT INFORMATION START -->[\s\S]*?<!-- PRODUCT INFORMATION END -->/, '');
    card = card.replace(/\s*<!-- PRODUCT ORDER START -->[\s\S]*?<!-- PRODUCT ORDER END -->/, '');
    const name = (card.match(/class="product-title-link[^\"]*"[^>]*>([^<]+)/) || [])[1] || escape(products[slug].name);
    card = card.replace(/<(?:a|button)[^>]*class="product-title-link[^\"]*"[^>]*>[^<]*<\/(?:a|button)>/,
      `<button type="button" class="product-title-link product-details-toggle" aria-controls="details-${slug}" aria-expanded="false">${name}</button>`);
    const draft = `Hello CFP, I would like to place an order:\n\n1. "${name}" — 1 packet\n\nPlease confirm availability, packing and total price.`;
    const actions = `<div class="product-order-actions">
              <div class="product-packet-picker" role="group" aria-label="Packets of ${name}">
                <button type="button" class="packet-minus" aria-label="Decrease ${name} packets" disabled>−</button>
                <input class="packet-quantity" type="number" min="0" max="9007199254740991" step="1" inputmode="numeric" value="0" aria-label="Number of packets of ${name}">
                <button type="button" class="packet-plus" aria-label="Increase ${name} packets">+</button>
              </div>
              <a class="btn btn-primary product-order-link" href="https://wa.me/919960725539?text=${escape(encodeURIComponent(draft))}" target="_blank" rel="noopener noreferrer" aria-label="Place Order for ${name} on WhatsApp">Place Order ↗</a>
            </div>`;
    return card.replace('</article>', `  <!-- PRODUCT ORDER START -->\n            ${actions}\n            <!-- PRODUCT ORDER END -->\n            <!-- PRODUCT INFORMATION START -->\n            ${information(slug)}\n            <!-- PRODUCT INFORMATION END -->\n        </article>`);
  });
}
if (require.main === module) {
  const file = path.join(root, 'shop.html');
  fs.writeFileSync(file, build(fs.readFileSync(file, 'utf8')));
  console.log('Updated eight static product descriptions, ingredients, WhatsApp links and nutrition tables.');
}
module.exports = { products, information, build };
