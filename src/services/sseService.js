// src/services/sseService.js
// Live order updates using Server-Sent Events (SSE) with heartbeat and channel scoping

class SseService {
  constructor() {
    // Map of orderId -> Set of client response objects
    this.clients = new Map();

    // Periodic heartbeat to prevent socket timeouts
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  subscribe(orderId, res) {
    if (!this.clients.has(orderId)) {
      this.clients.set(orderId, new Set());
    }

    const orderClients = this.clients.get(orderId);
    orderClients.add(res);

    // Initial greeting
    res.write(`event: connected\ndata: ${JSON.stringify({ orderId, timestamp: new Date().toISOString() })}\n\n`);

    // Clean up on disconnect
    res.on('close', () => {
      orderClients.delete(res);
      if (orderClients.size === 0) {
        this.clients.delete(orderId);
      }
    });
  }

  publishStatusUpdate(orderId, { status, orderNumber, timestamp, customerMessage, courierInfo = null }) {
    const orderClients = this.clients.get(orderId);
    if (!orderClients || orderClients.size === 0) {
      return;
    }

    const payload = JSON.stringify({
      orderId,
      orderNumber,
      status,
      timestamp: timestamp || new Date().toISOString(),
      message: customerMessage || `Order status updated to ${status}.`,
      courierInfo
    });

    const message = `event: order_status_update\ndata: ${payload}\n\n`;

    for (const client of orderClients) {
      try {
        client.write(message);
      } catch (err) {
        console.error(`Failed to send SSE message to client for order ${orderId}:`, err.message);
      }
    }
  }

  sendHeartbeat() {
    const pingMessage = ': ping\n\n';
    for (const [orderId, clientSet] of this.clients.entries()) {
      for (const client of clientSet) {
        try {
          client.write(pingMessage);
        } catch (err) {
          clientSet.delete(client);
        }
      }
      if (clientSet.size === 0) {
        this.clients.delete(orderId);
      }
    }
  }

  getActiveSubscriberCount(orderId) {
    const clientSet = this.clients.get(orderId);
    return clientSet ? clientSet.size : 0;
  }
}

module.exports = new SseService();
