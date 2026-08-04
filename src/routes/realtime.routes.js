const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const realtimeController = require('../controllers/realtime.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { trackingParamSchema } = require('../validators/schemas');

const router = Router();

const streamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many stream connections.' },
  },
});

// Public live tracking stream (SSE)
router.get(
  '/stream/track/:trackingNumber',
  streamLimiter,
  validate(trackingParamSchema, 'params'),
  realtimeController.streamTracking
);

// Authenticated shipment stream
router.get('/stream/shipments/:id', authenticate, streamLimiter, realtimeController.streamShipment);

// Admin dashboard live feed
router.get(
  '/stream/admin',
  authenticate,
  requireAdmin,
  streamLimiter,
  realtimeController.streamAdminFeed
);

// Client-side Supabase Realtime config
router.get('/config', authenticate, realtimeController.getConfig);

module.exports = router;
