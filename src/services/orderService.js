// src/services/orderService.js
// Business logic for order placement, server-side price validation,
// state transitions, inventory reservation, and notification queueing

const db = require('../database');
const config = require('../config');
const monetary = require('../utils/monetary');
const { generateTrackingToken, generateOrderNumber } = require('../utils/cryptoUtils');
const productRepository = require('../repositories/productRepository');
const orderRepository = require('../repositories/orderRepository');
const orderItemRepository = require('../repositories/orderItemRepository');
const orderStatusHistoryRepository = require('../repositories/orderStatusHistoryRepository');
const notificationRepository = require('../repositories/notificationRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const adminAuditRepository = require('../repositories/adminAuditRepository');
const orderStateMachine = require('./orderStateMachine');
const sseService = require('./sseService');
const shippingService = require('./shippingService');

class OrderService {
  // Validate and calculate totals on server using database prices
  async validateAndCalculateCart(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const productIds = items.map(i => i.id || i.productId);
    const dbProducts = await productRepository.findByIds(productIds);
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const pid = item.id || item.productId;
      const product = productMap.get(pid);

      if (!product) {
        throw new Error(`Product with ID '${pid}' does not exist in store catalogue.`);
      }
      if (!product.active) {
        throw new Error(`Product '${product.name}' is currently unavailable.`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for product '${product.name}'.`);
      }
      if (product.inventory_quantity < qty) {
        throw new Error(`Insufficient stock for '${product.name}'. Available: ${product.inventory_quantity}, requested: ${qty}.`);
      }

      const unitPrice = Number(product.price);
      const lineTotal = monetary.multiply(unitPrice, qty);
      calculatedSubtotal = monetary.add(calculatedSubtotal, lineTotal);

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice,
        quantity: qty,
        lineTotal
      });
    }

    // Shipping fee rule: Free shipping for orders >= 499, otherwise 50
    const shippingFee = calculatedSubtotal >= config.store.freeShippingThreshold
      ? 0.00
      : config.store.standardShippingFee;

    const discountAmount = 0.00;
    const taxAmount = 0.00; // MRP includes all taxes
    const totalAmount = monetary.add(calculatedSubtotal, shippingFee);

    return {
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discountAmount,
      shippingFee,
      taxAmount,
      totalAmount
    };
  }

  // Create an order inside a database transaction
  async createOrder({
    userId = null,
    guestEmail = null,
    guestPhone = null,
    items,
    shippingAddress,
    customerNotes = null,
    idempotencyKey = null,
    paymentMethod = 'cod'
  }) {
    // Check idempotency
    if (idempotencyKey) {
      const existingOrder = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existingOrder) {
        return existingOrder;
      }
    }

    if (!shippingAddress || !shippingAddress.recipient_name || !shippingAddress.address_line1 || !shippingAddress.city || !shippingAddress.postal_code) {
      throw new Error('Incomplete shipping address provided.');
    }

    const {
      items: validatedItems,
      subtotal,
      discountAmount,
      shippingFee,
      taxAmount,
      totalAmount
    } = await this.validateAndCalculateCart(items);

    const orderNumber = generateOrderNumber();
    const guestTrackingToken = generateTrackingToken();

    // Execute atomic creation transaction
    const createdOrder = await db.transaction(async (client) => {
      // 1. Decrement inventory
      for (const item of validatedItems) {
        await productRepository.decrementInventory(item.productId, item.quantity, client);
      }

      // 2. Persist order
      const initialPaymentStatus = paymentMethod === 'cod' ? 'pending' : 'pending';
      const order = await orderRepository.create({
        orderNumber,
        userId,
        guestEmail,
        guestPhone,
        guestTrackingToken,
        currency: config.store.currency,
        subtotal,
        discountAmount,
        shippingFee,
        taxAmount,
        totalAmount,
        shippingAddressSnapshot: shippingAddress,
        paymentStatus: initialPaymentStatus,
        fulfillmentStatus: config.orderStatuses.PLACED,
        customerNotes,
        idempotencyKey
      }, client);

      // 3. Persist order item snapshots
      await orderItemRepository.createMany(order.id, validatedItems, client);

      // 4. Record initial status history
      await orderStatusHistoryRepository.create({
        orderId: order.id,
        previousStatus: null,
        newStatus: config.orderStatuses.PLACED,
        actorType: userId ? 'customer' : 'guest',
        actorId: userId || guestEmail,
        customerMessage: 'Your order has been placed and received by Choudhari Farm Products.',
        source: 'checkout_submission'
      }, client);

      // 5. Queue transactional outbox notification
      const recipient = guestEmail || shippingAddress.email;
      if (recipient) {
        await notificationRepository.queue({
          orderId: order.id,
          customerReference: userId || recipient,
          channel: 'email',
          notificationType: 'order_received',
          recipient,
          templateName: 'order_received',
          payload: {
            customerName: shippingAddress.recipient_name,
            orderNumber: order.order_number,
            totalAmount: order.total_amount,
            itemCount: validatedItems.length,
            trackingLink: `${config.appUrl}/track-order.html?token=${guestTrackingToken}`
          }
        }, client);
      }

      return order;
    });

    return createdOrder;
  }

  // Admin action: Confirm order
  async confirmOrder(orderId, { adminId, adminEmail, note = null }) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found.');

    orderStateMachine.validateTransition(order.fulfillment_status, config.orderStatuses.CONFIRMED);

    const updated = await db.transaction(async (client) => {
      const updatedOrder = await orderRepository.updateFulfillmentStatus(orderId, config.orderStatuses.CONFIRMED, client);

      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: config.orderStatuses.CONFIRMED,
        actorType: 'admin',
        actorId: adminId,
        reason: note,
        customerMessage: 'Order confirmed and sent to kitchen packing station.',
        source: 'admin_dashboard'
      }, client);

      await adminAuditRepository.logAction({
        adminId,
        adminEmail,
        action: 'CONFIRM_ORDER',
        entityType: 'order',
        entityId: orderId,
        previousState: { fulfillment_status: order.fulfillment_status },
        newState: { fulfillment_status: config.orderStatuses.CONFIRMED }
      }, client);

      // Queue customer notification
      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: 'order_confirmed',
          recipient,
          templateName: 'order_confirmed',
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            trackingLink: `${config.appUrl}/track-order.html?token=${order.guest_tracking_token}`
          }
        }, client);
      }

      return updatedOrder;
    });

    // Publish live SSE update after commit
    sseService.publishStatusUpdate(orderId, {
      status: config.orderStatuses.CONFIRMED,
      orderNumber: order.order_number,
      customerMessage: 'Your order has been confirmed by Choudhari Farm Products.'
    });

    return updated;
  }

  // Admin action: Mark order packed
  async packOrder(orderId, { adminId, adminEmail, note = null }) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found.');

    orderStateMachine.validateTransition(order.fulfillment_status, config.orderStatuses.PACKED);

    const updated = await db.transaction(async (client) => {
      const updatedOrder = await orderRepository.updateFulfillmentStatus(orderId, config.orderStatuses.PACKED, client);

      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: config.orderStatuses.PACKED,
        actorType: 'admin',
        actorId: adminId,
        reason: note,
        customerMessage: 'Order is securely packed and ready for dispatch.',
        source: 'admin_dashboard'
      }, client);

      await adminAuditRepository.logAction({
        adminId,
        adminEmail,
        action: 'PACK_ORDER',
        entityType: 'order',
        entityId: orderId,
        previousState: { fulfillment_status: order.fulfillment_status },
        newState: { fulfillment_status: config.orderStatuses.PACKED }
      }, client);

      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: 'order_packed',
          recipient,
          templateName: 'order_packed',
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            trackingLink: `${config.appUrl}/track-order.html?token=${order.guest_tracking_token}`
          }
        }, client);
      }

      return updatedOrder;
    });

    sseService.publishStatusUpdate(orderId, {
      status: config.orderStatuses.PACKED,
      orderNumber: order.order_number,
      customerMessage: 'Your order is packed and awaiting courier pickup.'
    });

    return updated;
  }

  // Admin action: Mark order shipped
  async shipOrder(orderId, { adminId, adminEmail, courierName, awbCode, note = null }) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found.');

    orderStateMachine.validateTransition(order.fulfillment_status, config.orderStatuses.SHIPPED);

    const shipment = await shippingService.createShipment({
      orderId,
      orderNumber: order.order_number,
      recipientName: order.customer_full_name,
      phone: order.guest_phone,
      courierName,
      awbCode
    });

    const updated = await db.transaction(async (client) => {
      const updatedOrder = await orderRepository.updateFulfillmentStatus(orderId, config.orderStatuses.SHIPPED, client);

      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: config.orderStatuses.SHIPPED,
        actorType: 'admin',
        actorId: adminId,
        reason: note,
        customerMessage: `Dispatched via ${shipment.courier_name}. AWB: ${shipment.awb_code}`,
        source: 'admin_dashboard'
      }, client);

      await adminAuditRepository.logAction({
        adminId,
        adminEmail,
        action: 'SHIP_ORDER',
        entityType: 'order',
        entityId: orderId,
        previousState: { fulfillment_status: order.fulfillment_status },
        newState: {
          fulfillment_status: config.orderStatuses.SHIPPED,
          courier_name: shipment.courier_name,
          awb_code: shipment.awb_code
        }
      }, client);

      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: 'order_shipped',
          recipient,
          templateName: 'order_shipped',
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            courierName: shipment.courier_name,
            awbCode: shipment.awb_code,
            trackingLink: shipment.tracking_url || `${config.appUrl}/track-order.html?token=${order.guest_tracking_token}`
          }
        }, client);
      }

      return updatedOrder;
    });

    sseService.publishStatusUpdate(orderId, {
      status: config.orderStatuses.SHIPPED,
      orderNumber: order.order_number,
      customerMessage: `Dispatched via ${shipment.courier_name} (AWB: ${shipment.awb_code})`,
      courierInfo: {
        courierName: shipment.courier_name,
        awbCode: shipment.awb_code,
        trackingUrl: shipment.tracking_url
      }
    });

    return updated;
  }

  // Cancel order (with inventory restoration)
  async cancelOrder(orderId, { actorType, actorId, actorEmail, reason }) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found.');

    orderStateMachine.validateTransition(order.fulfillment_status, config.orderStatuses.CANCELLED);

    const items = await orderItemRepository.findByOrderId(orderId);

    const updated = await db.transaction(async (client) => {
      // 1. Restock inventory
      for (const item of items) {
        if (item.product_id) {
          await productRepository.restoreInventory(item.product_id, item.quantity, client);
        }
      }

      // 2. Mark cancelled
      const updatedOrder = await orderRepository.cancelOrder(orderId, reason, client);

      // 3. Status history
      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: config.orderStatuses.CANCELLED,
        actorType,
        actorId,
        reason,
        customerMessage: `Order cancelled. Reason: ${reason}`,
        source: actorType === 'admin' ? 'admin_dashboard' : 'customer_request'
      }, client);

      if (actorType === 'admin') {
        await adminAuditRepository.logAction({
          adminId: actorId,
          adminEmail: actorEmail,
          action: 'CANCEL_ORDER',
          entityType: 'order',
          entityId: orderId,
          previousState: { fulfillment_status: order.fulfillment_status },
          newState: { fulfillment_status: config.orderStatuses.CANCELLED, reason }
        }, client);
      }

      // 4. Queue notification
      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: 'order_cancelled',
          recipient,
          templateName: 'order_cancelled',
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            cancellationReason: reason
          }
        }, client);
      }

      return updatedOrder;
    });

    sseService.publishStatusUpdate(orderId, {
      status: config.orderStatuses.CANCELLED,
      orderNumber: order.order_number,
      customerMessage: `Order has been cancelled: ${reason}`
    });

    return updated;
  }

  // Courier webhook update (e.g. out for delivery, delivered, exception)
  async updateCourierTracking(orderId, newFulfillmentStatus, { courierStatus, courierNotes = null, source = 'shipping_webhook' }) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found.');

    if (order.fulfillment_status === newFulfillmentStatus) {
      return order; // Idempotent no-op
    }

    orderStateMachine.validateTransition(order.fulfillment_status, newFulfillmentStatus);

    const updated = await db.transaction(async (client) => {
      const updatedOrder = await orderRepository.updateFulfillmentStatus(orderId, newFulfillmentStatus, client);

      await orderStatusHistoryRepository.create({
        orderId,
        previousStatus: order.fulfillment_status,
        newStatus: newFulfillmentStatus,
        actorType: 'shipping_webhook',
        actorId: 'courier_gateway',
        reason: courierNotes || `Courier reported: ${courierStatus}`,
        customerMessage: `Courier update: ${newFulfillmentStatus.replace(/_/g, ' ')}.`,
        source
      }, client);

      const recipient = order.customer_email || order.guest_email;
      if (recipient) {
        const notifType = newFulfillmentStatus === config.orderStatuses.DELIVERED ? 'order_delivered'
          : newFulfillmentStatus === config.orderStatuses.OUT_FOR_DELIVERY ? 'out_for_delivery'
          : 'delivery_exception';

        await notificationRepository.queue({
          orderId,
          customerReference: recipient,
          channel: 'email',
          notificationType: notifType,
          recipient,
          templateName: notifType,
          payload: {
            customerName: order.customer_full_name || 'Customer',
            orderNumber: order.order_number,
            exceptionReason: courierNotes
          }
        }, client);
      }

      return updatedOrder;
    });

    sseService.publishStatusUpdate(orderId, {
      status: newFulfillmentStatus,
      orderNumber: order.order_number,
      customerMessage: `Order status updated to ${newFulfillmentStatus.replace(/_/g, ' ')}.`
    });

    return updated;
  }
}

module.exports = new OrderService();
