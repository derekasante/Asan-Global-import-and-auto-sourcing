const shipmentService = require('../services/shipment.service');

async function trackShipment(req, res, next) {
  try {
    const tracking = await shipmentService.trackByNumber(req.params.trackingNumber);
    res.json({ success: true, data: tracking });
  } catch (err) {
    next(err);
  }
}

module.exports = { trackShipment };
