// src/validators/schemas.js
// Schema validators for incoming API requests

function validateRegister(body) {
  const errors = [];
  if (!body.fullName || typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
    errors.push('Full name is required (minimum 2 characters).');
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Valid email address is required.');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  return errors;
}

function validateLogin(body) {
  const errors = [];
  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email address is required.');
  }
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required.');
  }
  return errors;
}

function validateAddress(body) {
  const errors = [];
  if (!body.recipient_name || body.recipient_name.trim().length < 2) {
    errors.push('Recipient name is required.');
  }
  if (!body.phone || !/^[0-9+\-\s]{7,15}$/.test(body.phone.trim())) {
    errors.push('Valid phone number is required.');
  }
  if (!body.address_line1 || body.address_line1.trim().length < 3) {
    errors.push('Street address line 1 is required.');
  }
  if (!body.city || body.city.trim().length < 2) {
    errors.push('City is required.');
  }
  if (!body.state || body.state.trim().length < 2) {
    errors.push('State is required.');
  }
  if (!body.postal_code || !/^[0-9]{5,8}$/.test(body.postal_code.trim())) {
    errors.push('Valid postal code / PIN code is required.');
  }
  return errors;
}

function validateOrderCreation(body) {
  const errors = [];
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('At least one item is required to place an order.');
  } else {
    body.items.forEach((item, index) => {
      const pid = item.id || item.productId;
      if (!pid) errors.push(`Item at index ${index} missing product ID.`);
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) errors.push(`Invalid quantity for item ${pid || index}.`);
    });
  }

  if (!body.shippingAddress || typeof body.shippingAddress !== 'object') {
    errors.push('Shipping address is required.');
  } else {
    const addr = body.shippingAddress;
    if (!addr.recipient_name) errors.push('Shipping recipient name is required.');
    if (!addr.address_line1) errors.push('Shipping address line 1 is required.');
    if (!addr.city) errors.push('Shipping city is required.');
    if (!addr.postal_code) errors.push('Shipping postal code is required.');
  }

  return errors;
}

function validateAdminShip(body) {
  const errors = [];
  if (!body.courierName || body.courierName.trim().length < 2) {
    errors.push('Courier name is required to confirm shipment dispatch.');
  }
  if (!body.awbCode || body.awbCode.trim().length < 4) {
    errors.push('AWB or tracking number is required.');
  }
  return errors;
}

function validateAdminCancel(body) {
  const errors = [];
  if (!body.reason || body.reason.trim().length < 3) {
    errors.push('A specific cancellation reason is required.');
  }
  return errors;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateAddress,
  validateOrderCreation,
  validateAdminShip,
  validateAdminCancel
};
