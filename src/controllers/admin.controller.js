const authService = require('../services/auth.service');
const adminService = require('../services/admin.service');
const customerService = require('../services/customer.service');
const shipmentService = require('../services/shipment.service');
const orderService = require('../services/order.service');
const messageService = require('../services/message.service');

async function adminLogin(req, res, next) {
  try {
    const result = await authService.adminLogin(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const result = await customerService.listCustomers({
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createShipment(req, res, next) {
  try {
    const { customer_id, ...shipmentData } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'customer_id is required' },
      });
    }

    const shipment = await shipmentService.createShipment(customer_id, shipmentData);
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

async function listShipments(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const result = await shipmentService.listShipments(req.user.id, 'admin', {
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
    const shipment = await shipmentService.getShipmentById(req.params.id, req.user.id, 'admin');
    res.json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

async function updateShipment(req, res, next) {
  try {
    const shipment = await shipmentService.updateShipment(req.params.id, req.body);
    res.json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

async function updateShipmentStatus(req, res, next) {
  try {
    const result = await shipmentService.updateShipmentStatus(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function deleteShipment(req, res, next) {
  try {
    const result = await shipmentService.deleteShipment(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const { status, customer_id, search, limit, offset } = req.query;
    const result = await orderService.listOrders({
      status,
      customer_id,
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function updateOrder(req, res, next) {
  try {
    const order = await orderService.updateOrder(req.params.id, req.body);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function deleteOrder(req, res, next) {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listMessages(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const result = await messageService.listMessages({
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getMessage(req, res, next) {
  try {
    const message = await messageService.getMessageById(req.params.id);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

async function updateMessage(req, res, next) {
  try {
    const message = await messageService.updateMessage(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const result = await messageService.deleteMessage(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
  getDashboard,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  createShipment,
  listShipments,
  getShipment,
  updateShipment,
  updateShipmentStatus,
  deleteShipment,
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  listMessages,
  getMessage,
  updateMessage,
  deleteMessage,
};
