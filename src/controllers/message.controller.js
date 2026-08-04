const messageService = require('../services/message.service');

async function submitMessage(req, res, next) {
  try {
    const customerId = req.user?.id && req.profile?.role === 'customer' ? req.user.id : null;
    const message = await messageService.submitMessage(req.body, customerId);
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitMessage };
