const realtimeService = require('../services/realtime.service');
const shipmentService = require('../services/shipment.service');
const { initSSE, sendSSE, keepAlive } = require('../utils/sse');
const { forbidden } = require('../utils/errors');

async function streamTracking(req, res, next) {
  let unsubscribe = null;
  let stopKeepAlive = null;

  try {
    initSSE(res);
    stopKeepAlive = keepAlive(res);

    unsubscribe = await realtimeService.subscribeToTracking(
      req.params.trackingNumber,
      (event) => sendSSE(res, event.type, event.data)
    );

    req.on('close', async () => {
      stopKeepAlive?.();
      if (unsubscribe) await unsubscribe();
    });
  } catch (err) {
    stopKeepAlive?.();
    if (unsubscribe) await unsubscribe();
    if (!res.headersSent) {
      next(err);
    } else {
      sendSSE(res, 'error', { message: err.message });
      res.end();
    }
  }
}

async function streamShipment(req, res, next) {
  let unsubscribe = null;
  let stopKeepAlive = null;

  try {
    const shipment = await shipmentService.getShipmentById(
      req.params.id,
      req.user.id,
      req.profile.role
    );

    if (req.profile.role !== 'admin' && shipment.customer_id !== req.user.id) {
      throw forbidden('You do not have access to this shipment stream');
    }

    initSSE(res);
    stopKeepAlive = keepAlive(res);

    unsubscribe = await realtimeService.subscribeToShipment(req.params.id, (event) =>
      sendSSE(res, event.type, event.data)
    );

    req.on('close', async () => {
      stopKeepAlive?.();
      if (unsubscribe) await unsubscribe();
    });
  } catch (err) {
    stopKeepAlive?.();
    if (unsubscribe) await unsubscribe();
    if (!res.headersSent) {
      next(err);
    } else {
      sendSSE(res, 'error', { message: err.message });
      res.end();
    }
  }
}

async function streamAdminFeed(req, res, next) {
  let unsubscribe = null;
  let stopKeepAlive = null;

  try {
    initSSE(res);
    stopKeepAlive = keepAlive(res);

    unsubscribe = realtimeService.subscribeToAdminFeed((event) =>
      sendSSE(res, event.type, event.data)
    );

    req.on('close', async () => {
      stopKeepAlive?.();
      if (unsubscribe) await unsubscribe();
    });
  } catch (err) {
    stopKeepAlive?.();
    if (unsubscribe) await unsubscribe();
    if (!res.headersSent) {
      next(err);
    } else {
      sendSSE(res, 'error', { message: err.message });
      res.end();
    }
  }
}

function getConfig(req, res) {
  const env = req.app.locals.env;
  const config = realtimeService.getRealtimeConfig(env, req.profile);
  res.json({ success: true, data: config });
}

module.exports = {
  streamTracking,
  streamShipment,
  streamAdminFeed,
  getConfig,
};
