// src/routes/authRoutes.js
// Customer account authentication and saved address endpoints

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireCustomerAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Customer auth
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireCustomerAuth, authController.getMe);
router.put('/profile', requireCustomerAuth, authController.updateProfile);

// Customer addresses (max 5 saved addresses)
router.get('/addresses', requireCustomerAuth, authController.listAddresses);
router.post('/addresses', requireCustomerAuth, authController.createAddress);
router.put('/addresses/:id', requireCustomerAuth, authController.updateAddress);
router.delete('/addresses/:id', requireCustomerAuth, authController.deleteAddress);

module.exports = router;
