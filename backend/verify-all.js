/*
 * verify-all.js — Automated endpoint + database verification for Asan Global backend
 *
 * Usage (while `npm start` is running):
 *   node backend/verify-all.js
 *
 * Prints PASS/FAIL for every endpoint and the database state.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const BASE = "http://localhost:5000";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;

function report(name, ok, detail = "") {
  const mark = ok ? "✅ PASS" : "❌ FAIL";
  console.log(`${mark}  ${name}${detail ? "  —  " + detail : ""}`);
  ok ? passed++ : failed++;
}

async function request(path, method = "GET", body = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

(async () => {
  console.log("\n===== ENDPOINT TESTS =====\n");

  // 1. GET /
  try {
    const r = await request("/");
    report("GET /", r.status === 200 && r.json.success, `status=${r.status} message="${r.json.message}"`);
  } catch (e) { report("GET /", false, e.message); }

  // 2. GET /health
  try {
    const r = await request("/health");
    report("GET /health", r.status === 200 && r.json.data?.status === "ok", `status=${r.status}`);
  } catch (e) { report("GET /health", false, e.message); }

  // 3. GET /test-db
  try {
    const r = await request("/test-db");
    report("GET /test-db", r.status === 200 && r.json.success, `status=${r.status} message="${r.json.message}"`);
  } catch (e) { report("GET /test-db", false, e.message); }

  // 4. POST /api/quotes
  let createdTracking = null;
  try {
    const r = await request("/api/quotes", "POST", {
      name: "Verify Script",
      phone: "555-0000",
      email: "verify@test.com",
      service: "Sea Freight",
      origin: "Tokyo",
      destination: "New York",
      vehicle_details: "2020 Toyota Corolla",
    });
    report("POST /api/quotes", r.status === 201 && r.json.success, `status=${r.status} message="${r.json.message}"`);
  } catch (e) { report("POST /api/quotes", false, e.message); }

  // 5. POST /api/shipments
  let createdShipmentId = null;
  try {
    const r = await request("/api/shipments", "POST", {
      customer_name: "Verify Script",
      customer_email: "verify@test.com",
      customer_phone: "555-0000",
      item_description: "2020 Toyota Corolla",
      origin: "Tokyo, Japan",
      destination: "New York, USA",
      service_type: "Sea Freight",
      status: "pending",
    });
    const ok = r.status === 201 && r.json.success;
    createdTracking = ok ? r.json.shipment?.tracking_number : null;
    createdShipmentId = ok ? r.json.shipment?.id : null;
    report("POST /api/shipments", ok, `status=${r.status} tracking=${createdTracking || "N/A"} id=${createdShipmentId || "N/A"}`);
  } catch (e) { report("POST /api/shipments", false, e.message); }

  // 6. GET /api/shipments/:tracking — use a freshly created tracking number
  if (createdTracking) {
    try {
      const r = await request("/api/shipments/" + encodeURIComponent(createdTracking));
      report("GET /api/shipments/:tracking", r.status === 200 && r.json.success, `tracking=${createdTracking} status=${r.status}`);
    } catch (e) { report("GET /api/shipments/:tracking", false, e.message); }
  } else {
    report("GET /api/shipments/:tracking", false, "skipped — no tracking number created (POST /api/shipments failed)");
  }

  // 7. POST /api/messages
  try {
    const r = await request("/api/messages", "POST", {
      name: "Verify Script",
      email: "verify@test.com",
      phone: "555-0000",
      subject: "Test Subject",
      body: "Test message body",
    });
    report("POST /api/messages", r.status === 201 && r.json.success, `status=${r.status} message="${r.json.message}"`);
  } catch (e) { report("POST /api/messages", false, e.message); }

  // 7b. POST /api/tracking-events — add a timeline update for the created shipment
  if (createdShipmentId) {
    try {
      const r = await request("/api/tracking-events", "POST", {
        shipment_id: createdShipmentId,
        status: "In Transit",
        location: "Tokyo, Japan",
        description: "Shipment loaded at port",
      });
      report("POST /api/tracking-events", r.status === 201 && r.json.success, `status=${r.status} shipmentId=${createdShipmentId}`);
    } catch (e) { report("POST /api/tracking-events", false, e.message); }
  } else {
    report("POST /api/tracking-events", false, "skipped — no shipment created (POST /api/shipments failed)");
  }

  // 7c. GET /api/tracking-events/:shipmentId — fetch the timeline for the created shipment
  if (createdShipmentId) {
    try {
      const r = await request("/api/tracking-events/" + encodeURIComponent(createdShipmentId));
      report("GET /api/tracking-events/:shipmentId", r.status === 200 && r.json.success && Array.isArray(r.json.events), `status=${r.status} events=${r.json.events ? r.json.events.length : "N/A"}`);
    } catch (e) { report("GET /api/tracking-events/:shipmentId", false, e.message); }
  } else {
    report("GET /api/tracking-events/:shipmentId", false, "skipped — no shipment created (POST /api/shipments failed)");
  }

  console.log("\n===== DATABASE TESTS (direct Supabase anon-key probes) =====\n");

  // 8. quotes schema
  try {
    const { data, error } = await supabase.from("quotes").select("name,email,service").limit(1);
    report("DB: quotes schema (name,email,service)", !error, error ? error.message.slice(0, 60) : "columns present");
  } catch (e) { report("DB: quotes schema", false, e.message); }

  // 9. shipments schema + SELECT (checks recursive RLS fix)
  try {
    const { data, error } = await supabase.from("shipments").select("tracking_number,status").limit(1);
    report("DB: shipments SELECT (RLS fix)", !error, error ? error.message.slice(0, 60) : "RLS ok, no recursion");
  } catch (e) { report("DB: shipments SELECT (RLS fix)", false, e.message); }

  // 10. messages INSERT policy
  try {
    const { data, error } = await supabase.from("messages").select("subject").limit(1);
    report("DB: messages SELECT (RLS fix)", !error, error ? error.message.slice(0, 60) : "RLS ok, no recursion");
  } catch (e) { report("DB: messages SELECT (RLS fix)", false, e.message); }

  // 11. profiles SELECT (recursive policy root-cause check)
  try {
    const { data, error } = await supabase.from("profiles").select("id").limit(1);
    report("DB: profiles SELECT (root recursion)", !error, error ? error.message.slice(0, 60) : "no recursion — helper works");
  } catch (e) { report("DB: profiles SELECT (root recursion)", false, e.message); }

  // 12. tracking_events schema + SELECT (checks RLS + table existence)
  try {
    const { data, error } = await supabase.from("tracking_events").select("id,status").limit(1);
    report("DB: tracking_events schema (RLS)", !error, error ? error.message.slice(0, 60) : "RLS ok, no recursion");
  } catch (e) { report("DB: tracking_events schema (RLS)", false, e.message); }

  console.log("\n==================================");
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? "\n🎉 ALL TESTS PASSED" : "\n⚠️  SOME TESTS FAILED — see above for details");
  console.log("==================================\n");
  process.exit(failed === 0 ? 0 : 1);
})();
