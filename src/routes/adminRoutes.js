// src/routes/adminRoutes.js
// Administrative dashboard operations, order processing, and notification controls

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdminAuth, requireRole } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Admin auth
router.post('/login', authLimiter, adminController.login);
router.post('/logout', requireAdminAuth, adminController.logout);
router.get('/me', requireAdminAuth, adminController.getMe);

// Operations dashboard and metrics
router.get('/dashboard', requireAdminAuth, adminController.getDashboard);
router.get('/enquiries', requireAdminAuth, require('../controllers/enquiryController').list);
router.get('/orders', requireAdminAuth, adminController.listOrders);
router.get('/orders/:id', requireAdminAuth, adminController.getOrderDetails);

// Contextual order processing actions
router.post('/orders/:id/confirm', requireAdminAuth, requireRole('order_manager', 'super_admin'), adminController.confirmOrder);
router.post('/orders/:id/pack', requireAdminAuth, requireRole('order_manager', 'super_admin'), adminController.packOrder);
router.post('/orders/:id/ship', requireAdminAuth, requireRole('order_manager', 'super_admin'), adminController.shipOrder);
router.post('/orders/:id/cancel', requireAdminAuth, requireRole('order_manager', 'super_admin'), adminController.cancelOrder);
router.post('/orders/:id/notes', requireAdminAuth, adminController.addNote);

// Outbox notification management and retries
router.get('/orders/:id/notifications', requireAdminAuth, adminController.listNotifications);
router.post('/notifications/:notificationId/retry', requireAdminAuth, requireRole('order_manager', 'super_admin'), adminController.retryNotification);

module.exports = router;
