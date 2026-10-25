// src/services/authService.js
// Authentication service for customer accounts and staff administrative access

const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/userRepository');
const adminUserRepository = require('../repositories/adminUserRepository');
const { hashPassword, verifyPassword } = require('../utils/cryptoUtils');

class AuthService {
  // Customer registration
  async registerCustomer({ fullName, email, password, phone = null }) {
    if (!fullName || !email || !password) {
      throw new Error('Full name, email address, and password are required.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      fullName,
      email,
      passwordHash,
      phone
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      type: 'customer'
    });

    return { user, token };
  }

  // Customer login
  async loginCustomer({ email, password }) {
    if (!email || !password) {
      throw new Error('Email address and password are required.');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.account_status !== 'active') {
      throw new Error('This account has been suspended. Please contact support.');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      type: 'customer'
    });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        email_verified: user.email_verified,
        phone: user.phone,
        created_at: user.created_at
      },
      token
    };
  }

  // Admin login
  async loginAdmin({ email, password }) {
    if (!email || !password) {
      throw new Error('Admin email and password are required.');
    }

    const admin = await adminUserRepository.findByEmail(email);
    if (!admin) {
      throw new Error('Invalid admin credentials.');
    }

    if (!admin.active) {
      throw new Error('Your administrative access has been deactivated.');
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Invalid admin credentials.');
    }

    await adminUserRepository.updateLastLogin(admin.id);

    const token = this.generateToken({
      adminId: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: admin.role,
      type: 'admin'
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        last_login_at: new Date()
      },
      token
    };
  }

  generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, config.jwtSecret, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return null;
    }
  }
}

module.exports = new AuthService();
