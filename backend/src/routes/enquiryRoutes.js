const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/enquiryController');
const router = express.Router();
router.post('/', createRateLimiter({ windowMs: 60000, maxRequests: 20, message: 'Too many enquiries. Please wait a minute and try again.' }), controller.create);
module.exports = router;
