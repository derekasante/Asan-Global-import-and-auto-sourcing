const shipmentService = require('../services/shipment.service');
const { badRequest } = require('../utils/errors');

async function createShipment(req, res, next) {
  try {
    const { customer_id, ...shipmentData } = req.body;

    let customerId = req.user.id;

    if (customer_id) {
      if (req.profile.role !== 'admin') {
        throw badRequest('Only admins can create shipments for other customers');
      }
      customerId = customer_id;
    }

    const shipment = await shipmentService.createShipment(customerId, shipmentData);
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

async function listShipments(req, res, next) {
  try {
    const { status, limit, offset } = req.query;

    const result = await shipmentService.listShipments(req.user.id, req.profile.role, {
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getShipment(req, res, next) {
  try {
    const shipment = await shipmentService.getShipmentById(
      req.params.id,
      req.user.id,
      req.profile.role
    );
    res.json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await shipmentService.updateShipmentStatus(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createShipment, listShipments, getShipment, updateStatus };
