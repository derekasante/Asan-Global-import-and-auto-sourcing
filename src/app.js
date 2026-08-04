const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const trackingRoutes = require('./routes/tracking.routes');
const adminRoutes = require('./routes/admin.routes');
const messageRoutes = require('./routes/message.routes');
const realtimeRoutes = require('./routes/realtime.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp(env) {
  const app = express();

  app.locals.env = env;

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });

  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'asan-global-backend',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/shipments', shipmentRoutes);
  app.use('/api/track', trackingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/realtime', realtimeRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
