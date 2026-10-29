// src/server.js
// Choudhari Farm Products (CFP) Store Server

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const { runMigrations } = require('./database/migrator');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const productRoutes = require('./routes/productRoutes');
const { processOutbox } = require('./services/notificationService');

const app = express();

// Trust proxy for secure cookies behind reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// Capture raw body for webhook verification
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(config.sessionSecret));

// API-only server. Frontend files are served independently by Apache or the preview command.
app.get('/', (req, res) => {
  res.json({ service: 'CFP Backend API', health: '/api/health' });
});

const migrationPromise = runMigrations().catch(err => {
  console.error('Failed to run initial migrations on app start:', err.message);
});

// Ensure migrations are initialized before API requests are served
app.use(async (req, res, next) => {
  try {
    await migrationPromise;
  } catch (err) {}
  next();
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    store: config.store.name,
    environment: config.nodeEnv
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server function
async function startServer() {
  try {
    await runMigrations();

    // Start background outbox notification processor (runs every 30 seconds)
    setInterval(() => {
      processOutbox(10).catch(err => {
        console.error('[Notification Worker Error]:', err.message);
      });
    }, 30000);

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` CFP Backend API running on ${config.appUrl}`);
      console.log(` Health check: ${config.appUrl}/api/health`);
      console.log(` Frontend is separate. Start it only when needed with: npm run frontend`);
      console.log(`====================================================`);
    });

    return server;
  } catch (err) {
    console.error('Fatal server startup failure:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
