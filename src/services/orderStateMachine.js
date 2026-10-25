// src/services/orderStateMachine.js
// Order Lifecycle State Machine and Transition Guard

const { orderStatuses } = require('../config');

// Define permitted forward and exception state transitions
const ALLOWED_TRANSITIONS = {
  [orderStatuses.PLACED]: [
    orderStatuses.CONFIRMED,
    orderStatuses.CANCELLED
  ],
  [orderStatuses.CONFIRMED]: [
    orderStatuses.PACKED,
    orderStatuses.CANCELLED
  ],
  [orderStatuses.PACKED]: [
    orderStatuses.SHIPPED,
    orderStatuses.CANCELLED
  ],
  [orderStatuses.SHIPPED]: [
    orderStatuses.OUT_FOR_DELIVERY,
    orderStatuses.DELIVERED,
    orderStatuses.DELIVERY_EXCEPTION,
    orderStatuses.RETURNED
  ],
  [orderStatuses.OUT_FOR_DELIVERY]: [
    orderStatuses.DELIVERED,
    orderStatuses.DELIVERY_EXCEPTION,
    orderStatuses.RETURNED
  ],
  [orderStatuses.DELIVERY_EXCEPTION]: [
    orderStatuses.OUT_FOR_DELIVERY,
    orderStatuses.DELIVERED,
    orderStatuses.RETURNED
  ],
  [orderStatuses.DELIVERED]: [],
  [orderStatuses.CANCELLED]: [],
  [orderStatuses.RETURNED]: []
};

// Customer-facing timeline stage rank for progress tracking
const STATUS_RANKS = {
  [orderStatuses.PLACED]: 1,
  [orderStatuses.CONFIRMED]: 2,
  [orderStatuses.PACKED]: 3,
  [orderStatuses.SHIPPED]: 4,
  [orderStatuses.OUT_FOR_DELIVERY]: 5,
  [orderStatuses.DELIVERED]: 6
};

function canTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  if (currentStatus === nextStatus) return false; // Reject duplicate idempotent requests

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function validateTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    throw new Error(`Order is already in '${currentStatus}' status.`);
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const validNext = allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)';
    throw new Error(
      `Illegal transition from '${currentStatus}' to '${nextStatus}'. Permitted next states: ${validNext}.`
    );
  }

  return true;
}

function getTimelineStages() {
  return [
    { key: orderStatuses.PLACED, label: 'Order Placed' },
    { key: orderStatuses.CONFIRMED, label: 'Order Confirmed' },
    { key: orderStatuses.PACKED, label: 'Order Packed' },
    { key: orderStatuses.SHIPPED, label: 'Order Shipped' },
    { key: orderStatuses.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
    { key: orderStatuses.DELIVERED, label: 'Delivered' }
  ];
}

module.exports = {
  ALLOWED_TRANSITIONS,
  STATUS_RANKS,
  canTransition,
  validateTransition,
  getTimelineStages
};
