const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginSchema } = require('../validators/schemas');
const {
  adminUpdateCustomerSchema,
  createShipmentSchema,
  updateShipmentSchema,
  updateShipmentStatusSchema,
  createOrderSchema,
  updateOrderSchema,
  updateMessageSchema,
} = require('../validators/schemas');

const router = Router();

// Admin authentication (rejects non-admin users)
router.post('/auth/login', validate(loginSchema), adminController.adminLogin);

// All routes below require admin JWT
router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboard);

// Customers
router.get('/customers', adminController.listCustomers);
router.get('/customers/:id', adminController.getCustomer);
router.put('/customers/:id', validate(adminUpdateCustomerSchema), adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);

// Shipments — full CRUD + status
router.get('/shipments', adminController.listShipments);
router.post('/shipments', validate(createShipmentSchema), adminController.createShipment);
router.get('/shipments/:id', adminController.getShipment);
router.put('/shipments/:id', validate(updateShipmentSchema), adminController.updateShipment);
router.patch(
  '/shipments/:id/status',
  validate(updateShipmentStatusSchema),
  adminController.updateShipmentStatus
);
router.delete('/shipments/:id', adminController.deleteShipment);

// Orders
router.get('/orders', adminController.listOrders);
router.post('/orders', validate(createOrderSchema), adminController.createOrder);
router.get('/orders/:id', adminController.getOrder);
router.put('/orders/:id', validate(updateOrderSchema), adminController.updateOrder);
router.delete('/orders/:id', adminController.deleteOrder);

// Messages
router.get('/messages', adminController.listMessages);
router.get('/messages/:id', adminController.getMessage);
router.patch('/messages/:id', validate(updateMessageSchema), adminController.updateMessage);
router.delete('/messages/:id', adminController.deleteMessage);

module.exports = router;
