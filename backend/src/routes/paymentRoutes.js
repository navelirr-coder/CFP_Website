// src/routes/paymentRoutes.js
// Payment gateway initiation and client signature verification

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { optionalCustomerAuth } = require('../middleware/authMiddleware');

router.post('/create-order', optionalCustomerAuth, paymentController.createRazorpayOrder);
router.post('/verify', optionalCustomerAuth, paymentController.verifyPayment);

module.exports = router;
