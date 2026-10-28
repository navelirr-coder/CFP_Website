// src/routes/webhookRoutes.js
// Incoming verified webhooks from external logistics and payment partners

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/razorpay', webhookController.handleRazorpayWebhook);
router.post('/shiprocket', webhookController.handleShiprocketWebhook);

module.exports = router;
