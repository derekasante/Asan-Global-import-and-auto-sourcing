const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

// Transactional email notifications (fire-and-forget — never fails the request)
const {
  notifyQuoteSubmitted,
  notifyContactMessageSubmitted,
  notifyShipmentStatusUpdated,
  notifyShipmentDelivered,
} = require("./email/notifications");

const app = express();

app.use(cors());
app.use(express.json());

// Startup logging – confirm environment variables are loaded
console.log("🔧 Environment check:");
console.log(`  SUPABASE_URL:              ${process.env.SUPABASE_URL || "❌ NOT LOADED"}`);
console.log(`  SUPABASE_ANON_KEY:         ${process.env.SUPABASE_ANON_KEY ? "✅ Loaded (" + process.env.SUPABASE_ANON_KEY.substring(0, 20) + "…)" : "❌ NOT LOADED"}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Loaded (server-side secret, never exposed to clients)" : "⚠️ Not set (falling back to anon key)"}`);
console.log(`  NODE_ENV:                  ${process.env.NODE_ENV || "not set"}`);

// Prefer the server-side service role key (bypasses RLS for trusted backend ops).
// Never expose this key to the frontend — it stays in the backend process only.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

/* =====================================================================
 *  Helpers
 * ===================================================================== */
function validateRequired(body, fields) {
  const missing = fields.filter((f) => !body[f] || String(body[f]).trim() === "");
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
}

function handleError(res, error, fallbackStatus = 500) {
  console.error("[API ERROR]", error.message || error);
  res.status(error.status || fallbackStatus).json({
    success: false,
    error: error.message || "Internal server error",
  });
}

/* =====================================================================
 *  Health check
 * ===================================================================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Asan Global Backend is connected 🚢🔥",
    endpoints: [
      "GET  /",
      "GET  /health",
      "GET  /test-db",
      "POST /api/quotes",
      "POST /api/shipments",
      "GET  /api/shipments/:trackingNumber",
      "POST /api/messages",
      "GET  /api/tracking-events/:shipmentId",
      "POST /api/tracking-events",
    ],
  });
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      service: "asan-global-backend",
      timestamp: new Date().toISOString(),
    },
  });
});

/* =====================================================================
 *  GET /test-db  –  Supabase connection test (quotes table)
 * ===================================================================== */
app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      });
    }

    res.json({
      success: true,
      message: "Supabase is working ✅",
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
});

/* =====================================================================
 *  POST /api/quotes  –  Public quote request (homepage "Get a Quote")
 *  Table: public.quotes (migration 003)
 * ===================================================================== */
app.post("/api/quotes", async (req, res) => {
  try {
    const { name, phone, email, service, origin, destination, vehicle_details } = req.body;

    validateRequired(req.body, ["name", "email", "service"]);

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        name,
        phone: phone || null,
        email,
        service,
        origin: origin || null,
        destination: destination || null,
        vehicle_details: vehicle_details || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Fire-and-forget notifications — email failure never fails the request.
    notifyQuoteSubmitted({ quote: data }).catch((err) => {
      console.error("[notifications] notifyQuoteSubmitted failed:", err.message || err);
    });

    res.status(201).json({
      success: true,
      message: "Quote request received! We will contact you within 24 hours.",
      quote: data,
    });
  } catch (error) {
    handleError(res, error, 400);
  }
});

/* =====================================================================
 *  POST /api/shipments  –  Create a shipment (public / import form)
 *  Table: public.shipments (migrations 001 + 005)
 * ===================================================================== */
app.post("/api/shipments", async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      item_description,
      origin,
      destination,
      service_type,
      status = "pending",
    } = req.body;

    validateRequired(req.body, ["customer_name", "origin", "destination"]);

    const tracking_number = "ASG-" + Date.now();

    const shipmentPayload = {
      tracking_number,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      item_description: item_description || null,
      origin,
      destination,
      service_type: service_type || null,
      status: (status || "pending").toLowerCase(),
    };

    const { data, error } = await supabase
      .from("shipments")
      .insert([shipmentPayload])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        help: "If the database schema is missing shipment columns, run supabase/migrations/005_fix_shipments_and_rls.sql in the Supabase SQL Editor.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Shipment created 🚢",
      shipment: data,
    });
  } catch (error) {
    handleError(res, error, 400);
  }
});

/* =====================================================================
 *  GET /api/shipments/:trackingNumber  –  Public tracking
 *  Looks up a shipment by tracking number (ASG-...)
 * ===================================================================== */
app.get("/api/shipments/:trackingNumber", async (req, res) => {
  try {
    const trackingNumber = String(req.params.trackingNumber || "").trim().toUpperCase();
    if (!trackingNumber) {
      return res.status(400).json({ success: false, error: "Tracking number is required" });
    }

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "No shipment found with this tracking number",
      });
    }

    res.json({ success: true, shipment: data });
  } catch (error) {
    handleError(res, error);
  }
});

/* =====================================================================
 *  POST /api/messages  –  Public contact form (homepage "Contact Us")
 *  Table: public.messages (migration 002)
 * ===================================================================== */
app.post("/api/messages", async (req, res) => {
  try {
    const { name, email, phone, subject, body } = req.body;

    validateRequired(req.body, ["name", "email", "subject", "body"]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        name,
        email,
        phone: phone || null,
subject,
        body,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Fire-and-forget notifications — email failure never fails the request.
    notifyContactMessageSubmitted({ message: data }).catch((err) => {
      console.error("[notifications] notifyContactMessageSubmitted failed:", err.message || err);
    });

    res.status(201).json({
      success: true,
      message: "Your message has been sent! We will get back to you shortly.",
      message_record: data,
    });
  } catch (error) {
    handleError(res, error, 400);
  }
});

/* =====================================================================
 *  GET /api/tracking-events/:shipmentId  –  Live timeline for a shipment
 *  Table: public.tracking_events (migration 007)
 *  Returns the full timeline history, newest events appended in ascending order
 * ===================================================================== */
app.get("/api/tracking-events/:shipmentId", async (req, res) => {
  try {
    const shipmentId = String(req.params.shipmentId || "").trim();
    if (!shipmentId) {
      return res.status(400).json({ success: false, error: "Shipment ID is required" });
    }

    const { data, error } = await supabase
      .from("tracking_events")
      .select("id, status, location, description, created_at")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        help: "If the tracking_events table is missing, run supabase/migrations/007_tracking_events.sql in the Supabase SQL Editor.",
      });
    }

    res.json({ success: true, events: data || [] });
  } catch (error) {
    handleError(res, error);
  }
});

/* =====================================================================
 *  POST /api/tracking-events  –  Add a shipment timeline update (admin)
 *  Table: public.tracking_events (migration 007)
 * ===================================================================== */
app.post("/api/tracking-events", async (req, res) => {
  try {
    const { shipment_id, status, location, description } = req.body;

    validateRequired(req.body, ["shipment_id", "status"]);

    const { data, error } = await supabase
      .from("tracking_events")
      .insert({
        shipment_id,
        status,
        location: location || null,
        description: description || null,
      })
      .select()
      .single();

if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        help: "If the tracking_events table is missing, run supabase/migrations/007_tracking_events.sql in the Supabase SQL Editor.",
      });
    }

    // Fire-and-forget notifications — email failure never fails the request.
    // Fetch the associated shipment to send the customer a status update.
    (async () => {
      try {
        const { data: shipment, error: shpErr } = await supabase
          .from("shipments")
          .select("*")
          .eq("id", shipment_id)
          .maybeSingle();
        if (shpErr || !shipment) {
          console.error("[notifications] Could not load shipment for email:", shpErr?.message || "not found");
          return;
        }
        // Always notify the customer of the new status.
        await notifyShipmentStatusUpdated({ shipment });
        // If delivered, also send the dedicated "delivered" notification.
        if (String(status).toLowerCase() === "delivered") {
          await notifyShipmentDelivered({ shipment });
        }
      } catch (err) {
        console.error("[notifications] notifyShipmentStatusUpdated failed:", err.message || err);
      }
    })();

    res.status(201).json({
      success: true,
      message: "Tracking event created",
      event: data,
    });
  } catch (error) {
    handleError(res, error, 400);
  }
});

/* =====================================================================
 *  404 handler
 * ===================================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚢 Asan Global backend running on port ${PORT}\n`);
});

