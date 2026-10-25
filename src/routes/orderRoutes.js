// src/routes/orderRoutes.js
// Customer order placement, tracking, and live status stream endpoints

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireCustomerAuth, optionalCustomerAuth } = require('../middleware/authMiddleware');
const { checkoutLimiter } = require('../middleware/rateLimiter');

// Public tracking endpoint (via guest token or orderNumber + phone)
router.get('/track', optionalCustomerAuth, orderController.trackOrder);

// Customer order submission (guest or logged-in)
router.post('/', optionalCustomerAuth, checkoutLimiter, orderController.createOrder);

// Authenticated customer order history
router.get('/', requireCustomerAuth, orderController.getMyOrders);

// Order details and live SSE streaming
router.get('/:id', optionalCustomerAuth, orderController.getOrderById);
router.get('/:id/events', optionalCustomerAuth, orderController.subscribeOrderEvents);

module.exports = router;
