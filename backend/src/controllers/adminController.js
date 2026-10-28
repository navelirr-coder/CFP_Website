// src/controllers/adminController.js
// Administrative dashboard operations, order processing, and audit tracking

const authService = require('../services/authService');
const orderService = require('../services/orderService');
const orderRepository = require('../repositories/orderRepository');
const orderItemRepository = require('../repositories/orderItemRepository');
const orderStatusHistoryRepository = require('../repositories/orderStatusHistoryRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const notificationRepository = require('../repositories/notificationRepository');
const adminAuditRepository = require('../repositories/adminAuditRepository');
const { validateLogin, validateAdminShip, validateAdminCancel } = require('../validators/schemas');
const config = require('../config');

const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

async function login(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { admin, token } = await authService.loginAdmin({
      email: req.body.email,
      password: req.body.password
    });

    res.cookie('cfp_admin_token', token, ADMIN_COOKIE_OPTIONS);
    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      admin,
      token
    });
  } catch (err) {
    if (err.message.includes('Invalid admin') || err.message.includes('deactivated')) {
      return res.status(401).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('cfp_admin_token');
  return res.json({ success: true, message: 'Admin logged out successfully.' });
}

async function getMe(req, res) {
  return res.json({ success: true, admin: req.admin });
}

async function getDashboard(req, res, next) {
  try {
    const metrics = await orderRepository.getDashboardMetrics();
    return res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const {
      search = '',
      fulfillmentStatus = '',
      paymentStatus = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 20
    } = req.query;

    const data = await orderRepository.listForAdmin({
      search,
      fulfillmentStatus,
      paymentStatus,
      startDate,
      endDate,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getOrderDetails(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderRepository.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const [items, history, shipments, notifications, auditLogs] = await Promise.all([
      orderItemRepository.findByOrderId(id),
      orderStatusHistoryRepository.findByOrderId(id),
      shipmentRepository.findByOrderId(id),
      notificationRepository.listByOrderId(id),
      adminAuditRepository.listByEntity('order', id)
    ]);

    return res.json({
      success: true,
      order: {
        ...order,
        shipping_address: typeof order.shipping_address_snapshot === 'string'
          ? JSON.parse(order.shipping_address_snapshot)
          : order.shipping_address_snapshot
      },
      items,
      history,
      shipments,
      notifications,
      auditLogs
    });
  } catch (err) {
    next(err);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updated = await orderService.confirmOrder(id, {
      adminId: req.admin.adminId,
      adminEmail: req.admin.email,
      note
    });

    return res.json({
      success: true,
      message: 'Order confirmed successfully.',
      order: updated
    });
  } catch (err) {
    if (err.message.includes('Illegal transition') || err.message.includes('already')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function packOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updated = await orderService.packOrder(id, {
      adminId: req.admin.adminId,
      adminEmail: req.admin.email,
      note
    });

    return res.json({
      success: true,
      message: 'Order marked as packed.',
      order: updated
    });
  } catch (err) {
    if (err.message.includes('Illegal transition') || err.message.includes('already')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function shipOrder(req, res, next) {
  try {
    const { id } = req.params;
    const errors = validateAdminShip(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { courierName, awbCode, note } = req.body;

    const updated = await orderService.shipOrder(id, {
      adminId: req.admin.adminId,
      adminEmail: req.admin.email,
      courierName,
      awbCode,
      note
    });

    return res.json({
      success: true,
      message: 'Order marked as shipped with tracking information.',
      order: updated
    });
  } catch (err) {
    if (err.message.includes('Illegal transition') || err.message.includes('already')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const errors = validateAdminCancel(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { reason } = req.body;

    const updated = await orderService.cancelOrder(id, {
      actorType: 'admin',
      actorId: req.admin.adminId,
      actorEmail: req.admin.email,
      reason
    });

    return res.json({
      success: true,
      message: 'Order cancelled and stock inventory restored.',
      order: updated
    });
  } catch (err) {
    if (err.message.includes('Illegal transition')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note || note.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Note text is required.' });
    }

    const updated = await orderRepository.updateAdminNotes(id, note.trim());
    return res.json({ success: true, message: 'Internal admin note updated.', order: updated });
  } catch (err) {
    next(err);
  }
}

async function listNotifications(req, res, next) {
  try {
    const { id } = req.params;
    const notifications = await notificationRepository.listByOrderId(id);
    return res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

async function retryNotification(req, res, next) {
  try {
    const { notificationId } = req.params;
    const updated = await notificationRepository.retry(notificationId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    // Trigger immediate outbox delivery attempt
    const { processOutbox } = require('../services/notificationService');
    await processOutbox(5);

    return res.json({ success: true, message: 'Notification queued for immediate retry.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  getDashboard,
  listOrders,
  getOrderDetails,
  confirmOrder,
  packOrder,
  shipOrder,
  cancelOrder,
  addNote,
  listNotifications,
  retryNotification
};
