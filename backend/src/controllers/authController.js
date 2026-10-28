// src/controllers/authController.js
// Customer account authentication and address profile controller

const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const addressRepository = require('../repositories/addressRepository');
const { validateRegister, validateLogin, validateAddress } = require('../validators/schemas');
const config = require('../config');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

async function register(req, res, next) {
  try {
    const errors = validateRegister(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { user, token } = await authService.registerCustomer({
      fullName: req.body.fullName,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone
    });

    res.cookie('cfp_token', token, COOKIE_OPTIONS);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user,
      token
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { user, token } = await authService.loginCustomer({
      email: req.body.email,
      password: req.body.password
    });

    res.cookie('cfp_token', token, COOKIE_OPTIONS);
    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user,
      token
    });
  } catch (err) {
    if (err.message.includes('Invalid email') || err.message.includes('suspended')) {
      return res.status(401).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('cfp_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
}

async function getMe(req, res, next) {
  try {
    const user = await userRepository.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone } = req.body;
    const updated = await userRepository.updateProfile(req.user.userId, { fullName, phone });
    return res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
}

async function listAddresses(req, res, next) {
  try {
    const addresses = await addressRepository.listByUserId(req.user.userId);
    return res.json({ success: true, addresses });
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const errors = validateAddress(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const created = await addressRepository.create(req.user.userId, req.body);
    return res.status(201).json({ success: true, address: created });
  } catch (err) {
    if (err.message.includes('Maximum limit')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const existing = await addressRepository.findById(req.params.id, req.user.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Address not found.' });
    }

    const updated = await addressRepository.update(req.params.id, req.user.userId, req.body);
    return res.json({ success: true, address: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const success = await addressRepository.deleteAddress(req.params.id, req.user.userId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Address not found.' });
    }
    return res.json({ success: true, message: 'Address removed successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};
