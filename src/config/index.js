// src/config/index.js
// Environment and application configuration constants

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'cfp_dev_jwt_super_secret_key_982143_healthy_millets',
  sessionSecret: process.env.SESSION_SECRET || 'cfp_dev_session_secret_key_847120_farm_direct',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  databaseUrl: process.env.DATABASE_URL || '',

  store: {
    name: 'Choudhari Farm Products',
    currency: 'INR',
    freeShippingThreshold: 499.00,
    standardShippingFee: 50.00,
    taxRatePercentage: 0.00, // All inclusive MRP prices
    maxSavedAddresses: 5,
    supportEmail: process.env.SUPPORT_EMAIL || 'chaudharifarmproducts@gmail.com',
    supportPhone: process.env.SUPPORT_PHONE || '+91 97646 58181',
    emailFrom: process.env.EMAIL_FROM || '"Choudhari Farm Products" <orders@choudharifarmproducts.com>'
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret',
    isConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_ID.includes('placeholder'))
  },

  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL || 'shipping@choudharifarmproducts.com',
    password: process.env.SHIPROCKET_PASSWORD || 'placeholder_pass',
    webhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET || 'placeholder_webhook_secret',
    isConfigured: !!(process.env.SHIPROCKET_PASSWORD && !process.env.SHIPROCKET_PASSWORD.includes('placeholder'))
  },

  roles: {
    SUPER_ADMIN: 'super_admin',
    ORDER_MANAGER: 'order_manager',
    SUPPORT: 'support'
  },

  orderStatuses: {
    PLACED: 'placed',
    CONFIRMED: 'confirmed',
    PACKED: 'packed',
    SHIPPED: 'shipped',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    DELIVERY_EXCEPTION: 'delivery_exception',
    RETURNED: 'returned'
  },

  paymentStatuses: {
    PENDING: 'pending',
    AUTHORIZED: 'authorized',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded'
  }
};
