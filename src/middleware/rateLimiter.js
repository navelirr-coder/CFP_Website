// src/middleware/rateLimiter.js
// In-memory sliding-window rate limiter for sensitive endpoints (auth, checkout, webhooks)

function createRateLimiter({ windowMs = 60000, maxRequests = 30, message = 'Too many requests. Please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of stale entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const valid = timestamps.filter(ts => now - ts < windowMs);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, windowMs);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const clientKey = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const clientTimestamps = (requests.get(clientKey) || []).filter(ts => now - ts < windowMs);

    if (clientTimestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((windowMs - (now - clientTimestamps[0])) / 1000)
      });
    }

    clientTimestamps.push(now);
    requests.set(clientKey, clientTimestamps);
    next();
  };
}

module.exports = {
  createRateLimiter,
  authLimiter: createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many login attempts. Please wait 15 minutes.' }),
  checkoutLimiter: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Too many order requests. Please wait a moment.' }),
  apiLimiter: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 120, message: 'API rate limit exceeded.' })
};
