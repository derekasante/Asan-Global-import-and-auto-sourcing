const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const trackingController = require('../controllers/tracking.controller');
const { validate } = require('../middleware/validate');
const { trackingParamSchema } = require('../validators/schemas');

const router = Router();

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many tracking requests. Please try again later.',
    },
  },
});

router.get(
  '/:trackingNumber',
  trackingLimiter,
  validate(trackingParamSchema, 'params'),
  trackingController.trackShipment
);

module.exports = router;
