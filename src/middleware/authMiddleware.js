// src/middleware/authMiddleware.js
// Route protection middleware for customers and administrative staff

const authService = require('../services/authService');

function extractToken(req, cookieName) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return null;
}

// Require authenticated customer
function requireCustomerAuth(req, res, next) {
  const token = extractToken(req, 'cfp_token');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded || decoded.type !== 'customer') {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Please log in again.' });
  }

  req.user = decoded;
  next();
}

// Optional customer auth (for guest or logged in checkout)
function optionalCustomerAuth(req, res, next) {
  const token = extractToken(req, 'cfp_token');
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded && decoded.type === 'customer') {
      req.user = decoded;
    }
  }
  next();
}

// Require authenticated admin staff
function requireAdminAuth(req, res, next) {
  const token = extractToken(req, 'cfp_admin_token');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Administrative authorization required.' });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded || decoded.type !== 'admin') {
    return res.status(401).json({ success: false, error: 'Invalid or expired administrative credentials.' });
  }

  req.admin = decoded;
  next();
}

// Role-based access control guard
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative access.' });
    }

    if (req.admin.role === 'super_admin' || allowedRoles.includes(req.admin.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied. Requires one of: ${allowedRoles.join(', ')}.`
    });
  };
}

module.exports = {
  requireCustomerAuth,
  optionalCustomerAuth,
  requireAdminAuth,
  requireRole
};
