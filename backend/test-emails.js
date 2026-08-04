/**
 * Asan Global — Email Flow Test Script
 * ------------------------------------------------------------------
 * Exercises all 4 transactional email flows through the LOG provider
 * so nothing is actually sent. Set EMAIL_ENABLED=true EMAIL_PROVIDER=log
 * to see the full rendered HTML/plain-text output in the console.
 *
 * Usage:
 *   cd backend
 *   npm install            (ensure nodemailer installed for SMTP path)
 *   node test-emails.js
 *
 * You can also set ADMIN_NOTIFY_EMAILS to see admin notifications, e.g.:
 *   ADMIN_NOTIFY_EMAILS=admin@test.com node test-emails.js
 */

// Force the log provider so no real emails are sent during tests.
process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED || "true";
process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "log";
process.env.ADMIN_NOTIFY_EMAILS =
  process.env.ADMIN_NOTIFY_EMAILS || "admin@test.com,ops@test.com";

const {
  notifyQuoteSubmitted,
  notifyContactMessageSubmitted,
  notifyShipmentStatusUpdated,
  notifyShipmentDelivered,
} = require("./email/notifications");

const sampleQuote = {
  id: "quote-test-001",
  name: "John Mensah",
  email: "customer@test.com",
  phone: "+233 24 000 0000",
  service: "Vehicle Import",
  origin: "Japan",
  destination: "Ghana",
  vehicle_details: "2024 Toyota Land Cruiser",
  created_at: new Date().toISOString(),
};

const sampleMessage = {
  id: "msg-test-001",
  name: "Ama Osei",
  email: "ama@test.com",
  phone: "+233 24 000 0001",
  subject: "Tracking query",
  body: "Where is my shipment? It should be clearing customs now.",
  created_at: new Date().toISOString(),
};

const sampleShipment = {
  id: "shp-test-001",
  tracking_number: "ASG-1234567890",
  customer_name: "Kwame Asante",
  customer_email: "kwame@test.com",
  item_description: "2024 Mercedes-Benz S-Class",
  origin: "Germany",
  destination: "Ghana",
  status: "in_transit",
  updated_at: new Date().toISOString(),
};

async function run() {
  console.log("\n========== ASAN GLOBAL — EMAIL FLOW TESTS ==========\n");
  console.log(`Provider: ${process.env.EMAIL_PROVIDER} | Enabled: ${process.env.EMAIL_ENABLED}`);
  console.log(`Admin recipients: ${process.env.ADMIN_NOTIFY_EMAILS}\n`);

  // 1. Quote submitted -> customer confirmation + admin notification
  console.log("--- [1/4] Quote submitted ---");
  await notifyQuoteSubmitted({ quote: sampleQuote });
  console.log("Quote flow complete.\n");

  // 2. Contact message submitted -> customer confirmation + admin notification
  console.log("--- [2/4] Contact message submitted ---");
  await notifyContactMessageSubmitted({ message: sampleMessage });
  console.log("Message flow complete.\n");

  // 3. Shipment status updated -> customer notification
  console.log("--- [3/4] Shipment status updated ---");
  await notifyShipmentStatusUpdated({ shipment: { ...sampleShipment, status: "customs_clearance" } });
  console.log("Status update flow complete.\n");

  // 4. Shipment delivered -> customer notification
  console.log("--- [4/4] Shipment delivered ---");
  await notifyShipmentDelivered({ shipment: { ...sampleShipment, status: "delivered" } });
  console.log("Delivered flow complete.\n");

  console.log("========== ALL EMAIL FLOWS EXERCISED ==========");
  console.log("No emails were actually sent (log provider).");
  console.log('To send real emails, set EMAIL_ENABLED=true and EMAIL_PROVIDER=smtp in the backend/.env file.');
}

run().catch((err) => {
  console.error("Test run FAILED:", err);
  process.exit(1);
});

