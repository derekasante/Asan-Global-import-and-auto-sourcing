/**
 * Asan Global — Email Notifications (Orchestration)
 * ------------------------------------------------------------------
 * High-level functions that wrap the mailer + templates for each
 * transactional flow. All functions are fire-and-forget: they never
 * throw and never block the HTTP response. The DB operation is always
 * independent of email delivery.
 *
 * Flows:
 *   1. quoteSubmitted        -> customer confirmation + admin notification
 *   2. contactMessageSubmitted -> customer confirmation + admin notification
 *   3. shipmentStatusUpdated -> customer notification
 *   4. shipmentDelivered     -> customer notification
 */
const { sendNotification } = require("../mailer");
const {
  quoteSubmittedCustomer,
  quoteSubmittedAdmin,
  messageSubmittedCustomer,
  messageSubmittedAdmin,
  shipmentStatusUpdatedCustomer,
  shipmentDeliveredCustomer,
} = require("./templates");
const { loadEmailConfig } = require("../config/email");

/** A single admin recipient is supported; config may define several. */
function adminRecipients() {
  const cfg = loadEmailConfig();
  return cfg.adminNotifyEmails;
}

/**
 * Fire one email, guarded so it never throws.
 * Returns a promise that resolves to { sent, provider, error? }.
 */
async function safeSend(to, template, boundary) {
  try {
    const result = await sendNotification({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      boundary,
    });
    return result;
  } catch (err) {
    console.error("[notifications] Unexpected send error:", err.message || err);
    return { sent: false, error: err.message || String(err) };
  }
}

/* ------------------------------------------------------------------
   1. Quote submitted
------------------------------------------------------------------ */
async function notifyQuoteSubmitted({ quote, adminEmails }) {
  const customerEmail = quote.email;
  const to = adminEmails && adminEmails.length ? adminEmails : adminRecipients();

  // Customer confirmation (best-effort)
  if (customerEmail) {
    await safeSend(
      customerEmail,
      quoteSubmittedCustomer({
        name: quote.name,
        service: quote.service,
        origin: quote.origin,
        destination: quote.destination,
        vehicleDetails: quote.vehicle_details || quote.vehicleDetails,
        reference: quote.reference || quote.id,
      }),
      "quote-customer"
    );
  }

  // Admin notification (skip if no admin recipients configured)
  if (to.length) {
    await safeSend(
      to,
      quoteSubmittedAdmin({
        name: quote.name,
        email: quote.email,
        phone: quote.phone,
        service: quote.service,
        origin: quote.origin,
        destination: quote.destination,
        vehicleDetails: quote.vehicle_details || quote.vehicleDetails,
        reference: quote.reference || quote.id,
        createdAt: quote.created_at || quote.created,
      }),
      "quote-admin"
    );
  }
}

/* ------------------------------------------------------------------
   2. Contact message submitted
------------------------------------------------------------------ */
async function notifyContactMessageSubmitted({ message, adminEmails }) {
  const customerEmail = message.email;
  const to = adminEmails && adminEmails.length ? adminEmails : adminRecipients();

  // Customer confirmation
  if (customerEmail) {
    await safeSend(
      customerEmail,
      messageSubmittedCustomer({
        name: message.name,
        subject: message.subject,
      }),
      "message-customer"
    );
  }

  // Admin notification
  if (to.length) {
    await safeSend(
      to,
      messageSubmittedAdmin({
        name: message.name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        body: message.body,
        createdAt: message.created_at || message.created,
      }),
      "message-admin"
    );
  }
}

/* ------------------------------------------------------------------
   3. Shipment status updated (customer)
------------------------------------------------------------------ */
async function notifyShipmentStatusUpdated({ shipment }) {
  const customerEmail = shipment.customer_email;
  if (!customerEmail) return;

  const trackingUrl = `${loadEmailConfig().appBaseUrl}/tracking.html?tracking=${encodeURIComponent(
    shipment.tracking_number || shipment.trackingNumber || ""
  )}`;

  await safeSend(
    customerEmail,
    shipmentStatusUpdatedCustomer({
      customerName: shipment.customer_name || shipment.customerName,
      trackingNumber: shipment.tracking_number || shipment.trackingNumber,
      status: shipment.status,
      itemDescription: shipment.item_description || shipment.itemDescription,
      origin: shipment.origin,
      destination: shipment.destination,
      trackingUrl,
    }),
    "shipment-status"
  );
}

/* ------------------------------------------------------------------
   4. Shipment delivered (customer)
------------------------------------------------------------------ */
async function notifyShipmentDelivered({ shipment }) {
  const customerEmail = shipment.customer_email;
  if (!customerEmail) return;

  await safeSend(
    customerEmail,
    shipmentDeliveredCustomer({
      customerName: shipment.customer_name || shipment.customerName,
      trackingNumber: shipment.tracking_number || shipment.trackingNumber,
      itemDescription: shipment.item_description || shipment.itemDescription,
      origin: shipment.origin,
      destination: shipment.destination,
      deliveredAt: shipment.delivered_at || shipment.updated_at || new Date().toISOString(),
    }),
    "shipment-delivered"
  );
}

module.exports = {
  notifyQuoteSubmitted,
  notifyContactMessageSubmitted,
  notifyShipmentStatusUpdated,
  notifyShipmentDelivered,
  adminRecipients,
};
