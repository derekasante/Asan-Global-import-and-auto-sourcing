const { Router } = require('express');
const shipmentController = require('../controllers/shipment.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createShipmentSchema, updateShipmentStatusSchema } = require('../validators/schemas');

const router = Router();

router.use(authenticate);

router.post('/', validate(createShipmentSchema), shipmentController.createShipment);
router.get('/', shipmentController.listShipments);
router.get('/:id', shipmentController.getShipment);
router.patch(
  '/:id/status',
  requireAdmin,
  validate(updateShipmentStatusSchema),
  shipmentController.updateStatus
);

module.exports = router;
