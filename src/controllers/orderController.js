// src/controllers/orderController.js
// Customer checkout submission, order tracking, and live SSE event subscription

const orderService = require('../services/orderService');
const orderRepository = require('../repositories/orderRepository');
const orderItemRepository = require('../repositories/orderItemRepository');
const orderStatusHistoryRepository = require('../repositories/orderStatusHistoryRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const sseService = require('../services/sseService');
const { validateOrderCreation } = require('../validators/schemas');

async function createOrder(req, res, next) {
  try {
    const errors = validateOrderCreation(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const userId = req.user ? req.user.userId : null;
    const { items, shippingAddress, customerNotes, idempotencyKey, paymentMethod } = req.body;

    const order = await orderService.createOrder({
      userId,
      guestEmail: req.body.guestEmail || (shippingAddress ? shippingAddress.email : null),
      guestPhone: req.body.guestPhone || (shippingAddress ? shippingAddress.phone : null),
      items,
      shippingAddress,
      customerNotes,
      idempotencyKey,
      paymentMethod: paymentMethod || 'cod'
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        shippingFee: order.shipping_fee,
        subtotal: order.subtotal,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        guestTrackingToken: order.guest_tracking_token,
        createdAt: order.created_at
      }
    });
  } catch (err) {
    if (err.message.includes('Insufficient stock') || err.message.includes('unavailable') || err.message.includes('does not exist')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await orderRepository.listByUserId(req.user.userId);
    return res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderRepository.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Authorization check: Must be owner if user order
    if (order.user_id && (!req.user || req.user.userId !== order.user_id)) {
      return res.status(403).json({ success: false, error: 'Access denied to this order.' });
    }

    const [items, history, shipments] = await Promise.all([
      orderItemRepository.findByOrderId(id),
      orderStatusHistoryRepository.findByOrderId(id),
      shipmentRepository.findByOrderId(id)
    ]);

    return res.json({
      success: true,
      order,
      items,
      timeline: history.map(h => ({
        status: h.new_status,
        timestamp: h.created_at,
        message: h.customer_message || `Order status updated to ${h.new_status}.`
      })),
      shipments: shipments.map(s => ({
        courierName: s.courier_name,
        awbCode: s.awb_code,
        trackingUrl: s.tracking_url,
        status: s.status,
        dispatchDate: s.dispatch_date
      }))
    });
  } catch (err) {
    next(err);
  }
}

// Secure public / guest order tracking endpoint
async function trackOrder(req, res, next) {
  try {
    const { token, orderNumber, phone } = req.query;
    let order = null;

    if (token) {
      order = await orderRepository.findByTrackingToken(token.trim());
    } else if (orderNumber && phone) {
      const found = await orderRepository.findByOrderNumber(orderNumber.trim());
      if (found) {
        const address = typeof found.shipping_address_snapshot === 'string'
          ? JSON.parse(found.shipping_address_snapshot)
          : found.shipping_address_snapshot;

        const cleanPhone = (p) => (p || '').replace(/[^0-9]/g, '');
        const orderPhone = cleanPhone(found.guest_phone || (address && address.phone));
        const inputPhone = cleanPhone(phone);

        if (orderPhone.endsWith(inputPhone) || inputPhone.endsWith(orderPhone)) {
          order = found;
        }
      }
    } else if (orderNumber) {
      // If customer is logged in, allow lookup by order number
      if (req.user) {
        const found = await orderRepository.findByOrderNumber(orderNumber.trim());
        if (found && found.user_id === req.user.userId) {
          order = found;
        }
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found. Please verify your order number and phone, or use your secure tracking link.'
      });
    }

    const [items, history, shipments] = await Promise.all([
      orderItemRepository.findByOrderId(order.id),
      orderStatusHistoryRepository.findByOrderId(order.id),
      shipmentRepository.findByOrderId(order.id)
    ]);

    // Privacy mask on recipient and locality (never expose full street address or full contact publicly)
    const address = typeof order.shipping_address_snapshot === 'string'
      ? JSON.parse(order.shipping_address_snapshot)
      : order.shipping_address_snapshot;

    const safeAddress = address ? {
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      recipient_initial: address.recipient_name ? address.recipient_name.charAt(0) + '***' : 'Customer'
    } : null;

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        currency: order.currency,
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        createdAt: order.created_at,
        deliveryDestination: safeAddress
      },
      items: items.map(i => ({
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        lineTotal: i.line_total
      })),
      timeline: history.map(h => ({
        status: h.new_status,
        timestamp: h.created_at,
        message: h.customer_message || `Order status: ${h.new_status}.`
      })),
      shipment: shipments[0] ? {
        courierName: shipments[0].courier_name,
        awbCode: shipments[0].awb_code,
        trackingUrl: shipments[0].tracking_url,
        status: shipments[0].status,
        dispatchDate: shipments[0].dispatch_date
      } : null
    });
  } catch (err) {
    next(err);
  }
}

// Server-Sent Events live tracking subscription
async function subscribeOrderEvents(req, res, next) {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const order = await orderRepository.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Validate authorization: either logged-in owner or matching guest tracking token
    const isOwner = req.user && req.user.userId === order.user_id;
    const hasValidToken = token && order.guest_tracking_token === token.trim();

    if (!isOwner && !hasValidToken) {
      return res.status(403).json({ success: false, error: 'Unauthorized to stream events for this order.' });
    }

    // Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders && res.flushHeaders();

    sseService.subscribe(id, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  subscribeOrderEvents
};
