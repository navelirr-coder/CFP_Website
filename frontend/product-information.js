/* Independent of cart, category filtering and the existing image-hover controller. */
document.addEventListener('DOMContentLoaded', () => {
  const products = window.CFP_PRODUCT_INFORMATION;
  const grid = document.getElementById('shopProductsGrid');
  const panel = document.getElementById('productInformation');
  if (!products || !grid || !panel) return;

  const content = document.getElementById('productInformationContent');
  const status = document.getElementById('productInformationStatus');
  const cards = Array.from(grid.querySelectorAll('.product-item-card'));
  const snackCards = cards.filter(card => products[card.dataset.product]);
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pinned = null;
  let displayed = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function render(slug) {
    if (displayed === slug) return;
    displayed = slug;
    const product = products[slug];
    content.replaceChildren();
    if (!product) {
      content.append(element('p', 'Choose a Crunchies or Bites snack to view its ingredients and nutrition.'));
      return;
    }
    const layout = element('div', undefined, 'product-information-layout');
    const overview = element('div', undefined, 'product-information-overview');
    overview.append(element('span', product.category.toUpperCase(), 'editorial-eyebrow'));
    const name = element('h3', product.name);
    name.id = 'productInformationName';
    overview.append(name, element('p', product.highlight, 'product-information-highlight'), element('p', product.description));
    overview.append(element('h4', 'Ingredients'), element('p', product.ingredients));

    const nutrition = element('div', undefined, 'product-information-nutrition');
    nutrition.append(element('h4', 'Nutritional information'));
    const table = element('table');
    const caption = element('caption', `${product.name} - values per 100 g and per ${product.servingSize} serving`);
    table.append(caption);
    const head = element('thead');
    const headings = element('tr');
    ['Nutrient', 'Per 100 g', `Per ${product.servingSize}`].forEach(label => {
      const th = element('th', label);
      th.scope = 'col';
      headings.append(th);
    });
    head.append(headings);
    const body = element('tbody');
    product.nutrition.forEach(row => {
      const tr = element('tr');
      const label = element('th', row.nutrient);
      label.scope = 'row';
      tr.append(label, element('td', row.per100g ?? 'Not provided'), element('td', row.perServing ?? 'Not provided'));
      body.append(tr);
    });
    table.append(head, body);
    nutrition.append(table);
    layout.append(overview, nutrition);
    content.append(layout);
  }

  function updateStatus() {
    const name = products[displayed]?.name;
    status.textContent = pinned
      ? `${name} selected. Click or tap another snack card to change the selection.`
      : name ? `Previewing ${name}. Select a card to keep its details visible.`
        : 'Choose a Crunchies or Bites snack to explore its details.';
  }

  function preview(card) {
    if (pinned) return;
    render(card.dataset.product);
    updateStatus();
  }

  function select(card) {
    pinned = card.dataset.product;
    render(pinned);
    snackCards.forEach(item => {
      const name = products[item.dataset.product].name;
      item.setAttribute('aria-label', `${name}${item === card ? ', selected' : ''}. Press Enter or Space to select product information.`);
    });
    updateStatus();
  }

  snackCards.forEach(card => {
    const product = products[card.dataset.product];
    // Only the existing description field changes; images, links and cart metadata stay intact.
    const description = card.querySelector('.product-short-desc');
    if (description) description.textContent = product.shortDescription;
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', `${product.name}. Press Enter or Space to select product information.`);
    card.setAttribute('aria-controls', 'productInformation');
    card.setAttribute('aria-describedby', 'productInformationHelp');
    card.addEventListener('mouseenter', () => {
      if (hoverPointer.matches) preview(card);
    });
    card.addEventListener('focusin', event => {
      if (event.target === card) preview(card);
    });
    card.addEventListener('click', event => {
      // Existing links navigate and purchase controls act normally, without selecting details.
      if (event.target.closest('a, button, input, select, textarea')) return;
      select(card);
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      select(card);
    });
  });

  // Follow existing category visibility without modifying category controls or their history.
  function syncVisibleCategory() {
    if (pinned) return;
    const visible = snackCards.find(card => card.style.display !== 'none');
    render(visible?.dataset.product ?? null);
    updateStatus();
  }
  new MutationObserver(syncVisibleCategory).observe(grid, {
    subtree: true, attributes: true, attributeFilter: ['style']
  });
  syncVisibleCategory();
});
