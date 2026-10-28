// admin.js - Choudhari Farm Products Admin Dashboard Controller

document.addEventListener('DOMContentLoaded', () => {
  let currentAdmin = null;
  let currentPage = 1;
  let activeOrderId = null;

  // DOM Elements
  const loginSection = document.getElementById('adminLoginSection');
  const mainApp = document.getElementById('adminMainApp');
  const loginForm = document.getElementById('adminLoginForm');
  const loginAlert = document.getElementById('loginAlert');
  const adminEmailInput = document.getElementById('adminEmail');
  const adminPasswordInput = document.getElementById('adminPassword');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const adminUserName = document.getElementById('adminUserName');
  const adminUserRole = document.getElementById('adminUserRole');

  // Tabs
  const subnavTabs = document.querySelectorAll('.subnav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Metrics
  const refreshMetricsBtn = document.getElementById('refreshMetricsBtn');
  const metricAwaitingReview = document.getElementById('metricAwaitingReview');
  const metricAwaitingPacking = document.getElementById('metricAwaitingPacking');
  const metricAwaitingDispatch = document.getElementById('metricAwaitingDispatch');
  const metricShipped = document.getElementById('metricShipped');
  const metricOutForDelivery = document.getElementById('metricOutForDelivery');
  const metricDelivered = document.getElementById('metricDelivered');
  const metricCancelled = document.getElementById('metricCancelled');
  const metricExceptions = document.getElementById('metricExceptions');
  const metricTotalOrders = document.getElementById('metricTotalOrders');
  const metricTotalRevenue = document.getElementById('metricTotalRevenue');
  const metricFailedNotifs = document.getElementById('metricFailedNotifs');

  // Orders Table & Filter Elements
  const orderSearchInput = document.getElementById('orderSearchInput');
  const filterFulfillmentStatus = document.getElementById('filterFulfillmentStatus');
  const filterPaymentStatus = document.getElementById('filterPaymentStatus');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  // Order Details Modal Elements
  const orderDetailsModal = document.getElementById('orderDetailsModal');
  const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
  const modalOrderTitle = document.getElementById('modalOrderTitle');
  const modalOrderDate = document.getElementById('modalOrderDate');
  const modalCustomerName = document.getElementById('modalCustomerName');
  const modalCustomerEmail = document.getElementById('modalCustomerEmail');
  const modalCustomerPhone = document.getElementById('modalCustomerPhone');
  const modalShippingAddress = document.getElementById('modalShippingAddress');
  const modalPaymentStatus = document.getElementById('modalPaymentStatus');
  const modalSubtotal = document.getElementById('modalSubtotal');
  const modalShippingFee = document.getElementById('modalShippingFee');
  const modalTotalAmount = document.getElementById('modalTotalAmount');
  const modalAdminNoteInput = document.getElementById('modalAdminNoteInput');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const modalItemsTableBody = document.getElementById('modalItemsTableBody');
  const modalTimeline = document.getElementById('modalTimeline');
  const modalShipmentsBox = document.getElementById('modalShipmentsBox');
  const modalNotificationsBox = document.getElementById('modalNotificationsBox');
  const orderActionButtons = document.getElementById('orderActionButtons');

  // Ship Modal Elements
  const shipModal = document.getElementById('shipModal');
  const closeShipModalBtn = document.getElementById('closeShipModalBtn');
  const cancelShipModalBtn = document.getElementById('cancelShipModalBtn');
  const shipForm = document.getElementById('shipForm');
  const shipCourierName = document.getElementById('shipCourierName');
  const shipAwbCode = document.getElementById('shipAwbCode');
  const shipNote = document.getElementById('shipNote');

  // --- INITIALIZATION & AUTH ---

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      if (res.ok && data.success) {
        currentAdmin = data.admin;
        showApp();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    mainApp.classList.add('hidden');
  }

  function showApp() {
    loginSection.classList.add('hidden');
    mainApp.classList.remove('hidden');
    adminUserName.textContent = currentAdmin.fullName || currentAdmin.email;
    adminUserRole.textContent = (currentAdmin.role || 'Admin').replace(/_/g, ' ');

    loadMetrics();
    loadOrders(1);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.add('hidden');
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        currentAdmin = data.admin;
        showApp();
      } else {
        loginAlert.textContent = data.error || (data.errors ? data.errors[0] : 'Authentication failed.');
        loginAlert.className = 'admin-alert error';
        loginAlert.classList.remove('hidden');
      }
    } catch (err) {
      loginAlert.textContent = 'Server connection error. Please try again.';
      loginAlert.className = 'admin-alert error';
      loginAlert.classList.remove('hidden');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {}
    currentAdmin = null;
    showLogin();
  });

  // --- NAVIGATION TABS ---

  subnavTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subnavTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');

      if (tab.dataset.tab === 'ordersTab') {
        loadOrders(currentPage);
      } else if (tab.dataset.tab === 'overviewTab') {
        loadMetrics();
      }
    });
  });

  // --- DASHBOARD METRICS ---

  async function loadMetrics() {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (res.ok && data.success) {
        const m = data.metrics;
        metricAwaitingReview.textContent = m.awaiting_review || 0;
        metricAwaitingPacking.textContent = m.awaiting_packing || 0;
        metricAwaitingDispatch.textContent = m.awaiting_dispatch || 0;
        metricShipped.textContent = m.shipped || 0;
        metricOutForDelivery.textContent = m.out_for_delivery || 0;
        metricDelivered.textContent = m.delivered || 0;
        metricCancelled.textContent = m.cancelled_or_failed || 0;
        metricExceptions.textContent = m.delivery_exceptions || 0;
        metricTotalOrders.textContent = m.total_orders || 0;
        metricTotalRevenue.textContent = `₹${Number(m.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        metricFailedNotifs.textContent = m.failed_notifications || 0;
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }

  refreshMetricsBtn.addEventListener('click', loadMetrics);

  // Metric cards click quick filter
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (filter) {
        // Switch to orders tab
        const ordersTabBtn = document.querySelector('[data-tab="ordersTab"]');
        ordersTabBtn.click();

        if (filter === 'exceptions') {
          filterFulfillmentStatus.value = 'delivery_exception';
        } else {
          filterFulfillmentStatus.value = filter;
        }
        loadOrders(1);
      }
    });
  });

  // --- ORDERS LISTING & SEARCH ---

  async function loadOrders(page = 1) {
    currentPage = page;
    ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading operational order data...</td></tr>';

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: '20',
      search: orderSearchInput.value.trim(),
      fulfillmentStatus: filterFulfillmentStatus.value,
      paymentStatus: filterPaymentStatus.value
    });

    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        renderOrdersTable(data.orders);
        updatePagination(data.page, data.totalPages, data.total);
      } else {
        ordersTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 error-text">${data.error || 'Failed to load orders.'}</td></tr>`;
      }
    } catch (err) {
      ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 error-text">Network connection error loading orders.</td></tr>';
    }
  }

  function renderOrdersTable(orders) {
    if (!orders || orders.length === 0) {
      ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No matching orders found.</td></tr>';
      return;
    }

    ordersTableBody.innerHTML = orders.map(order => {
      const dateFormatted = new Date(order.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const nextAction = getNextActionLabel(order.fulfillment_status);

      return `
        <tr>
          <td><strong>${escapeHtml(order.order_number)}</strong></td>
          <td><small>${dateFormatted}</small></td>
          <td>
            <div>${escapeHtml(order.customer_name || 'Guest Customer')}</div>
            <small class="text-muted">${escapeHtml(order.customer_email || '-')}</small>
          </td>
          <td><span class="badge badge-${order.payment_status}">${escapeHtml(order.payment_status)}</span></td>
          <td><span class="badge badge-${order.fulfillment_status}">${escapeHtml(order.fulfillment_status.replace(/_/g, ' '))}</span></td>
          <td><strong>₹${Number(order.total_amount).toFixed(2)}</strong></td>
          <td><span class="action-hint">${nextAction}</span></td>
          <td>
            <button class="btn btn-outline-sm view-order-btn" data-id="${order.id}">
              Inspect
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach inspect click handlers
    document.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openOrderModal(btn.dataset.id);
      });
    });
  }

  function getNextActionLabel(status) {
    switch (status) {
      case 'placed': return '<span style="color: #92400E; font-weight:600;">Confirm Order</span>';
      case 'confirmed': return '<span style="color: #1E40AF; font-weight:600;">Pack Order</span>';
      case 'packed': return '<span style="color: #5B21B6; font-weight:600;">Dispatch Shipment</span>';
      case 'shipped': return '<span style="color: #065F46;">In Transit</span>';
      case 'out_for_delivery': return '<span style="color: #3730A3;">Awaiting Delivery</span>';
      case 'delivered': return '<span style="color: #03543F;">Completed</span>';
      case 'cancelled': return '<span style="color: #991B1B;">Cancelled</span>';
      case 'delivery_exception': return '<span style="color: #B91C1C; font-weight:600;">Re-attempt Delivery</span>';
      default: return '-';
    }
  }

  function updatePagination(page, totalPages, totalCount) {
    paginationInfo.textContent = `Showing page ${page} of ${Math.max(1, totalPages)} (${totalCount} total orders)`;
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;
  }

  applyFiltersBtn.addEventListener('click', () => loadOrders(1));
  resetFiltersBtn.addEventListener('click', () => {
    orderSearchInput.value = '';
    filterFulfillmentStatus.value = '';
    filterPaymentStatus.value = '';
    loadOrders(1);
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) loadOrders(currentPage - 1);
  });

  nextPageBtn.addEventListener('click', () => {
    loadOrders(currentPage + 1);
  });

  // --- ORDER DETAILS MODAL ---

  async function openOrderModal(orderId) {
    activeOrderId = orderId;
    orderDetailsModal.classList.remove('hidden');

    modalOrderTitle.textContent = 'Loading order...';
    modalOrderDate.textContent = '';
    modalCustomerName.textContent = '-';
    modalCustomerEmail.textContent = '-';
    modalCustomerPhone.textContent = '-';
    modalShippingAddress.textContent = '-';
    modalItemsTableBody.innerHTML = '<tr><td colspan="4">Loading items...</td></tr>';
    modalTimeline.innerHTML = 'Loading timeline...';
    modalShipmentsBox.innerHTML = 'Loading shipments...';
    modalNotificationsBox.innerHTML = 'Loading outbox notifications...';
    orderActionButtons.innerHTML = '';

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();

      if (res.ok && data.success) {
        renderOrderDetails(data);
      } else {
        alert(data.error || 'Failed to load order details.');
      }
    } catch (err) {
      alert('Network error loading order details.');
    }
  }

  function renderOrderDetails({ order, items, history, shipments, notifications }) {
    modalOrderTitle.textContent = `Order: ${order.order_number}`;
    modalOrderDate.textContent = `Placed on: ${new Date(order.created_at).toLocaleString('en-IN')}`;

    modalCustomerName.textContent = order.customer_full_name || order.shipping_address?.recipient_name || 'Guest Customer';
    modalCustomerEmail.textContent = order.customer_email || order.guest_email || order.shipping_address?.email || 'N/A';
    modalCustomerPhone.textContent = order.guest_phone || order.shipping_address?.phone || 'N/A';

    const addr = order.shipping_address;
    if (addr) {
      modalShippingAddress.innerHTML = `
        <strong>${escapeHtml(addr.recipient_name || '')}</strong><br>
        ${escapeHtml(addr.address_line1 || '')}${addr.address_line2 ? ', ' + escapeHtml(addr.address_line2) : ''}<br>
        ${addr.locality ? escapeHtml(addr.locality) + '<br>' : ''}
        ${escapeHtml(addr.city || '')}, ${escapeHtml(addr.state || '')} - ${escapeHtml(addr.postal_code || '')}<br>
        Phone: ${escapeHtml(addr.phone || '')}
      `;
    }

    modalPaymentStatus.textContent = order.payment_status;
    modalPaymentStatus.className = `badge badge-${order.payment_status}`;
    modalSubtotal.textContent = `₹${Number(order.subtotal).toFixed(2)}`;
    modalShippingFee.textContent = `₹${Number(order.shipping_fee).toFixed(2)}`;
    modalTotalAmount.textContent = `₹${Number(order.total_amount).toFixed(2)}`;
    modalAdminNoteInput.value = order.admin_notes || '';

    // Render items snapshot
    modalItemsTableBody.innerHTML = items.map(item => `
      <tr>
        <td>
          <strong>${escapeHtml(item.product_name)}</strong>
          ${item.sku ? `<br><small class="text-muted">SKU: ${escapeHtml(item.sku)}</small>` : ''}
        </td>
        <td>${item.quantity}</td>
        <td>₹${Number(item.unit_price).toFixed(2)}</td>
        <td><strong>₹${Number(item.line_total).toFixed(2)}</strong></td>
      </tr>
    `).join('');

    // Render timeline
    modalTimeline.innerHTML = history.map(h => `
      <div class="timeline-step">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-status">${escapeHtml(h.new_status.replace(/_/g, ' '))}</div>
          <div class="timeline-time">${new Date(h.created_at).toLocaleString('en-IN')} via ${escapeHtml(h.source)}</div>
          <div class="timeline-msg">${escapeHtml(h.customer_message || h.reason || '')}</div>
        </div>
      </div>
    `).join('');

    // Render shipments
    if (shipments && shipments.length > 0) {
      modalShipmentsBox.innerHTML = shipments.map(s => `
        <div style="font-size: 13px; margin-bottom: 8px;">
          <strong>Courier:</strong> ${escapeHtml(s.courier_name || 'Standard Express')}<br>
          <strong>AWB:</strong> ${escapeHtml(s.awb_code || 'Pending')}<br>
          <strong>Status:</strong> ${escapeHtml(s.status)}<br>
          ${s.tracking_url ? `<a href="${escapeHtml(s.tracking_url)}" target="_blank" rel="noopener">Courier Tracking Link &rarr;</a>` : ''}
        </div>
      `).join('');
    } else {
      modalShipmentsBox.innerHTML = '<span class="text-muted" style="font-size: 13px;">No shipment records yet. Dispatch will generate tracking.</span>';
    }

    // Render notification outbox
    if (notifications && notifications.length > 0) {
      modalNotificationsBox.innerHTML = notifications.map(n => `
        <div style="font-size: 12px; margin-bottom: 6px; padding: 6px; background: #FFF; border-radius: 6px; border: 1px solid #E2E8E5;">
          <strong>${escapeHtml(n.notification_type)}</strong> to <code>${escapeHtml(n.recipient)}</code>
          <br>Status: <span class="badge badge-${n.status}">${n.status}</span> (Attempts: ${n.attempt_count})
          ${n.status === 'failed' ? `<button class="btn btn-text-sm retry-notif-btn" data-id="${n.id}" style="color: #991B1B; padding: 2px 6px;">↻ Retry</button>` : ''}
        </div>
      `).join('');

      document.querySelectorAll('.retry-notif-btn').forEach(btn => {
        btn.addEventListener('click', () => retryNotification(btn.dataset.id));
      });
    } else {
      modalNotificationsBox.innerHTML = '<span class="text-muted" style="font-size: 13px;">No notifications in outbox.</span>';
    }

    // Render allowed contextual actions
    renderActionButtons(order);
  }

  function renderActionButtons(order) {
    const status = order.fulfillment_status;
    let buttonsHtml = '';

    if (status === 'placed') {
      buttonsHtml += `
        <button id="actionConfirmBtn" class="btn btn-primary">Confirm Order</button>
        <button id="actionCancelBtn" class="btn btn-outline-sm" style="color: #991B1B;">Cancel Order</button>
      `;
    } else if (status === 'confirmed') {
      buttonsHtml += `
        <button id="actionPackBtn" class="btn btn-primary">Mark as Packed</button>
        <button id="actionCancelBtn" class="btn btn-outline-sm" style="color: #991B1B;">Cancel Order</button>
      `;
    } else if (status === 'packed') {
      buttonsHtml += `
        <button id="actionShipBtn" class="btn btn-primary">Verify & Dispatch Shipment</button>
        <button id="actionCancelBtn" class="btn btn-outline-sm" style="color: #991B1B;">Cancel Order</button>
      `;
    } else if (status === 'shipped') {
      buttonsHtml += `
        <span class="text-muted" style="font-size: 13px;">Dispatched. Tracking updates stream automatically from courier.</span>
      `;
    } else if (status === 'delivered') {
      buttonsHtml += `
        <span style="color: #03543F; font-weight: 600; font-size: 13px;">Order Delivered & Closed.</span>
      `;
    } else if (status === 'cancelled') {
      buttonsHtml += `
        <span style="color: #991B1B; font-weight: 600; font-size: 13px;">Order is Cancelled.</span>
      `;
    }

    orderActionButtons.innerHTML = buttonsHtml;

    // Attach listeners
    const confirmBtn = document.getElementById('actionConfirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (!confirm('Confirm this order for kitchen packing?')) return;
        executeOrderTransition('confirm');
      });
    }

    const packBtn = document.getElementById('actionPackBtn');
    if (packBtn) {
      packBtn.addEventListener('click', async () => {
        if (!confirm('Mark this order as packed in food-grade packaging?')) return;
        executeOrderTransition('pack');
      });
    }

    const shipBtn = document.getElementById('actionShipBtn');
    if (shipBtn) {
      shipBtn.addEventListener('click', () => {
        shipAwbCode.value = `BLUEDART${Date.now().toString().slice(-6)}`;
        shipModal.classList.remove('hidden');
      });
    }

    const cancelBtn = document.getElementById('actionCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        const reason = prompt('Please enter the cancellation reason (required):');
        if (!reason || reason.trim().length === 0) return;
        executeOrderCancel(reason.trim());
      });
    }
  }

  async function executeOrderTransition(action) {
    try {
      const res = await fetch(`/api/admin/orders/${activeOrderId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message);
        openOrderModal(activeOrderId);
        loadMetrics();
        loadOrders(currentPage);
      } else {
        alert(data.error || 'Transition failed.');
      }
    } catch (err) {
      alert('Network error executing transition.');
    }
  }

  async function executeOrderCancel(reason) {
    try {
      const res = await fetch(`/api/admin/orders/${activeOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message);
        openOrderModal(activeOrderId);
        loadMetrics();
        loadOrders(currentPage);
      } else {
        alert(data.error || 'Failed to cancel order.');
      }
    } catch (err) {
      alert('Network error cancelling order.');
    }
  }

  // Ship Form Submission
  shipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const courierName = shipCourierName.value.trim();
    const awbCode = shipAwbCode.value.trim();
    const note = shipNote.value.trim();

    try {
      const res = await fetch(`/api/admin/orders/${activeOrderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierName, awbCode, note })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        shipModal.classList.add('hidden');
        alert('Order dispatched and tracking stored.');
        openOrderModal(activeOrderId);
        loadMetrics();
        loadOrders(currentPage);
      } else {
        alert(data.error || 'Shipping submission failed.');
      }
    } catch (err) {
      alert('Network error submitting dispatch.');
    }
  });

  closeShipModalBtn.addEventListener('click', () => shipModal.classList.add('hidden'));
  cancelShipModalBtn.addEventListener('click', () => shipModal.classList.add('hidden'));

  // Save Internal Admin Note
  saveNoteBtn.addEventListener('click', async () => {
    const note = modalAdminNoteInput.value.trim();
    if (!note) return alert('Please enter a note to save.');

    try {
      const res = await fetch(`/api/admin/orders/${activeOrderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Internal admin note saved.');
      } else {
        alert(data.error || 'Failed to save note.');
      }
    } catch (err) {
      alert('Network error saving note.');
    }
  });

  // Retry Notification
  async function retryNotification(notificationId) {
    try {
      const res = await fetch(`/api/admin/notifications/${notificationId}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Notification retry queued and triggered.');
        openOrderModal(activeOrderId);
      } else {
        alert(data.error || 'Retry failed.');
      }
    } catch (err) {
      alert('Network error retrying notification.');
    }
  }

  closeOrderModalBtn.addEventListener('click', () => {
    orderDetailsModal.classList.add('hidden');
    activeOrderId = null;
  });

  // Utility to escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start Auth Check
  checkAuth();
});
