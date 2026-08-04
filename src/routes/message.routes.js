const { Router } = require('express');
const messageController = require('../controllers/message.controller');
const { validate } = require('../middleware/validate');
const { submitMessageSchema } = require('../validators/schemas');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/', validate(submitMessageSchema), messageController.submitMessage);

// Optional: authenticated customers can submit linked to their account
router.post('/authenticated', authenticate, validate(submitMessageSchema), messageController.submitMessage);

module.exports = router;
