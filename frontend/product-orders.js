// Packet selections live only on this page; WhatsApp receives the prepared list.
(() => {
  function packetCount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(number))) : 0;
  }
  function orderUrl(items) {
    const lines = items.filter(item => packetCount(item.quantity) > 0).map((item, index) => {
      const count = packetCount(item.quantity);
      return `${index + 1}. "${item.name}" — ${count} ${count === 1 ? 'packet' : 'packets'}`;
    });
    const message = `Hello CFP, I would like to place an order:\n\n${lines.join('\n')}\n\nPlease confirm availability, packing and total price.`;
    return `https://wa.me/919960725539?text=${encodeURIComponent(message)}`;
  }
  if (typeof module !== 'undefined') module.exports = { packetCount, orderUrl };
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('.product-item-card')).filter(card => card.querySelector('.packet-quantity'));
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const entries = cards.map(card => ({
      card, name: card.querySelector('.product-title-link').textContent.trim(),
      input: card.querySelector('.packet-quantity'), minus: card.querySelector('.packet-minus'),
      plus: card.querySelector('.packet-plus'), link: card.querySelector('.product-order-link'),
      preview: card.querySelector('.product-preview'), details: card.querySelector('.product-information'),
      toggle: card.querySelector('.product-details-toggle'), close: card.querySelector('.product-information-close'),
      quantity: 0, pinned: false, hovered: false
    }));

    function refreshOrders() {
      entries.forEach(entry => {
        entry.input.value = String(entry.quantity);
        entry.minus.disabled = entry.quantity === 0;
        entry.plus.disabled = entry.quantity === Number.MAX_SAFE_INTEGER;
        // A product's button includes that product (one packet if still at zero),
        // plus all positive selections, in catalogue order across both categories.
        entry.link.href = orderUrl(entries.map(item => ({ name: item.name, quantity: item.quantity || (item === entry ? 1 : 0) })));
      });
    }
    function renderDetails(entry) {
      const open = entry.pinned || entry.hovered;
      entry.details.hidden = !open;
      entry.toggle.setAttribute('aria-expanded', String(open));
    }
    function closeDetails(entry) {
      entry.pinned = entry.hovered = false;
      if (entry.details.contains(document.activeElement)) entry.toggle.focus({ preventScroll: true });
      renderDetails(entry);
    }
    entries.forEach(entry => {
      function setQuantity(value) { entry.quantity = packetCount(value); refreshOrders(); }
      entry.plus.addEventListener('click', () => setQuantity(entry.quantity + 1));
      entry.minus.addEventListener('click', () => setQuantity(entry.quantity - 1));
      entry.input.addEventListener('input', () => setQuantity(entry.input.value));
      entry.link.addEventListener('click', () => { if (!entry.quantity) setQuantity(1); });
      entry.card.addEventListener('mouseenter', () => { if (canHover) { entry.hovered = true; renderDetails(entry); } });
      entry.card.addEventListener('mouseleave', () => { entry.hovered = false; renderDetails(entry); });
      function toggleDetails() {
        if (entry.pinned) closeDetails(entry);
        else { entry.pinned = true; renderDetails(entry); }
      }
      entry.toggle.addEventListener('click', toggleDetails);
      entry.preview.addEventListener('click', event => { if (!event.target.closest('a, button, input')) toggleDetails(); });
      entry.close.addEventListener('click', () => closeDetails(entry));
      entry.card.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeDetails(entry); }
      });
      renderDetails(entry);
    });
    refreshOrders();

    // Preserve old #details-… links, including redirects from snack detail URLs.
    function openLinkedDetails() {
      const entry = entries.find(item => `#${item.details.id}` === window.location.hash);
      if (entry) {
        entry.pinned = true; renderDetails(entry);
        entry.details.scrollIntoView({ block: 'start' });
      }
    }
    window.addEventListener('hashchange', openLinkedDetails);
    openLinkedDetails();
  });
})();
