// src/routes/productRoutes.js
// Authoritative product catalogue API

const express = require('express');
const router = express.Router();
const productRepository = require('../repositories/productRepository');

router.get('/', async (req, res, next) => {
  try {
    const products = await productRepository.findAllActive();
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productRepository.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
