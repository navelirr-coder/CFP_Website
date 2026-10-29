// Display order history from the authenticated API. Never persist order data in the browser.
(() => {
  let revision = 0;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function orderCard(order) {
    const card = element('div', undefined, 'order-card-item');
    const table = element('table', undefined, 'order-items-table');
    const caption = element('caption', `Order #${order.order_number}`);
    caption.style.textAlign = 'left';
    const head = element('thead');
    const headings = element('tr');
    ['Ordered item', 'Quantity'].forEach(label => {
      const header = element('th', label);
      header.scope = 'col';
      header.style.textAlign = 'left';
      headings.append(header);
    });
    head.append(headings);
    const body = element('tbody');
    (order.items || []).forEach(item => {
      const row = element('tr');
      row.append(element('td', item.product_name), element('td', String(item.quantity)));
      body.append(row);
    });
    table.append(caption, head, body);
    card.append(table);
    return card;
  }

  async function loadHistory() {
    const container = document.getElementById('accountOrderHistory');
    if (!container) return;
    const currentRevision = ++revision;
    const heading = document.getElementById('accountOrdersHeading');
    container.setAttribute('aria-busy', 'true');
    container.replaceChildren(element('p', 'Loading your order history…'));
    try {
      const response = await fetch('/api/orders', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.orders)) {
        throw new Error(response.status === 401 ? 'Please sign in again to view your order history.' : 'Your order history could not be loaded. Please try again.');
      }
      if (currentRevision !== revision || document.getElementById('accountOrderHistory') !== container) return;
      heading.textContent = `Previous Orders (${data.orders.length})`;
      container.replaceChildren();
      if (!data.orders.length) {
        container.append(element('p', 'No orders found yet. Your purchases will appear here after checkout.'));
      } else {
        const list = element('div', undefined, 'orders-history-list');
        data.orders.forEach(order => list.append(orderCard(order)));
        container.append(list);
      }
    } catch (error) {
      if (currentRevision !== revision || document.getElementById('accountOrderHistory') !== container) return;
      heading.textContent = 'Previous Orders';
      const retry = element('button', 'Retry', 'btn btn-secondary btn-sm');
      retry.type = 'button';
      retry.addEventListener('click', loadHistory);
      container.replaceChildren(element('p', error.message === 'Please sign in again to view your order history.' ? error.message : 'Your order history could not be loaded. Please try again.'), retry);
    } finally {
      if (currentRevision === revision) container.setAttribute('aria-busy', 'false');
    }
  }
  document.addEventListener('cfp:account-rendered', loadHistory);
})();
