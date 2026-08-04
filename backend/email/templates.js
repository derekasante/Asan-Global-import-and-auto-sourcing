/**
 * Asan Global — Reusable Email Templates
 * ------------------------------------------------------------------
 * HTML + plain-text templates for all transactional emails.
 * These are provider-agnostic: they return a { subject, html, text }
 * object that any provider (SMTP, Resend, …) can send.
 *
 * Design follows the Asan Global brand (blue / gold / white).
 */

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */
function escapeHtml(str) {
  const amp = '&';
  const semi = ';';
  const hash = '#';
  const m = {
    '&': amp + 'amp' + semi,
    '<': amp + 'lt' + semi,
    '>': amp + 'gt' + semi,
    '"': amp + 'quot' + semi,
    "'": amp + hash + '39' + semi,
  };
  return String(str ?? '').replace(/[&<>"']/g, (c) => m[c]);
}

/** Wrap inner content in the shared branded HTML shell. */
function shell(innerHtml, { title = "Asan Global" } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f2557 0%,#1e4a82 55%,#2563eb 100%);padding:30px 34px;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.5px;">ASAN <span style="color:#f5c518;">GLOBAL</span></div>
              <div style="font-size:11px;color:rgba(255,255,255,.72);letter-spacing:.18em;text-transform:uppercase;margin-top:3px;">Import &amp; Auto Sourcing</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:34px 34px 24px;">
              ${innerHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 34px;border-top:1px solid #e2e8f0;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;line-height:1.6;">
                &copy; ${new Date().getFullYear()} Asan Global Import Services<br>
                <a href="#" style="color:#2563eb;text-decoration:none;">AsanGlobal.com</a> &nbsp;·&nbsp;
                <span>support@asanglobal.com</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Branded detail row (label on left, value on right). */
function row(label, value) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #eef2f7;padding:0 0 10px;margin:0 0 10px;">
    <tr>
      <td style="padding:4px 0;font-size:12px;color:#64748b;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;font-size:13px;color:#0f172a;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value) || "—"}</td>
    </tr>
  </table>`;
}

function statusPill(status) {
  const colors = {
    "Delivered": "background:#dcfce7;color:#15803d;",
    "In Transit": "background:#dbeafe;color:#1d4ed8;",
    "Customs Clearance": "background:#fce7f3;color:#be185d;",
    "Shipped": "background:#dbeafe;color:#1d4ed8;",
    "Out for Delivery": "background:#fef3c7;color:#92400e;",
    "Processing": "background:#f1f5f9;color:#475569;",
    "Pending": "background:#f1f5f9;color:#475569;",
  };
  const css = colors[status] || "background:#f1f5f9;color:#475569;";
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;${css}">${escapeHtml(status)}</span>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;"><tr>
    <td style="border-radius:10px;background:linear-gradient(135deg,#2563eb,#1e4a82);">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 26px;border-radius:10px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">${escapeHtml(label)}</a>
    </td>
  </tr></table>`;
}

/* ------------------------------------------------------------------
   Template: Quote confirmation (customer)
------------------------------------------------------------------ */
function quoteSubmittedCustomer({ name, service, origin, destination, vehicleDetails, reference }) {
  const subject = "We received your quote request — Asan Global";
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Thank you, ${escapeHtml(name || "there")}!</h2>
    <p style="margin:0 0 20px;font-size:13.5px;color:#475569;line-height:1.6;">
      We have received your quote request. A member of the Asan Global team will
      contact you shortly with a personalized quote.
    </p>
    ${row("Service", service)}
    ${row("Origin", origin)}
    ${row("Destination", destination)}
    ${row("Vehicle / Item", vehicleDetails)}
    ${row("Reference", reference || "—")}
    <p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
      Need to get in touch? Reply to this email or call our support line.
    </p>
  `, { title: "Quote Request Received — Asan Global" });
  const text = `Hi ${name || "there"},\n\nWe received your quote request.\nService: ${service || "—"}\nOrigin: ${origin || "—"}\nDestination: ${destination || "—"}\nVehicle/Item: ${vehicleDetails || "—"}\nReference: ${reference || "—"}\n\nWe will be in touch shortly.\n\n— Asan Global Import Services`;
  return { subject, html, text };
}

/* ------------------------------------------------------------------
   Template: Quote notification (admin)
------------------------------------------------------------------ */
function quoteSubmittedAdmin({ name, email, phone, service, origin, destination, vehicleDetails, reference, createdAt }) {
  const subject = `New quote request from ${name || "customer"}`;
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a;">New Quote Request</h2>
    <p style="margin:0 0 18px;font-size:13px;color:#475569;">A new quote request was submitted on the website.</p>
    ${row("Customer", name)}
    ${row("Email", email)}
    ${row("Phone", phone)}
    ${row("Service", service)}
    ${row("Origin", origin)}
    ${row("Destination", destination)}
    ${row("Vehicle / Item", vehicleDetails)}
    ${row("Reference", reference || "—")}
    ${row("Submitted", createdAt || new Date().toLocaleString())}
  `, { title: "New Quote Request — Asan Global" });
  const text = `New quote request\n\nName: ${name || "—"}\nEmail: ${email || "—"}\nPhone: ${phone || "—"}\nService: ${service || "—"}\nOrigin: ${origin || "—"}\nDestination: ${destination || "—"}\nVehicle/Item: ${vehicleDetails || "—"}\nReference: ${reference || "—"}`;
  return { subject, html, text };
}

/* ------------------------------------------------------------------
   Template: Contact message confirmation (customer)
------------------------------------------------------------------ */
function messageSubmittedCustomer({ name, subject }) {
  const outSubject = "We received your message — Asan Global";
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Message received, ${escapeHtml(name || "there")}</h2>
    <p style="margin:0 0 14px;font-size:13.5px;color:#475569;line-height:1.6;">
      Thanks for reaching out to Asan Global. Your message
      ${subject ? `<strong>“${escapeHtml(subject)}”</strong>` : ""} has been
      received and a member of our team will respond as soon as possible.
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
      We typically respond within 1 business day.
    </p>
  `, { title: "Message Received — Asan Global" });
  const text = `Hi ${name || "there"},\n\nWe received your message${subject ? ` "${subject}"` : ""}. A member of our team will respond shortly.\n\n— Asan Global Import Services`;
  return { subject: outSubject, html, text };
}

/* ------------------------------------------------------------------
   Template: Contact message notification (admin)
------------------------------------------------------------------ */
function messageSubmittedAdmin({ name, email, phone, subject, body, createdAt }) {
  const outSubject = `New contact message from ${name || "customer"}`;
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a;">New Contact Message</h2>
    <p style="margin:0 0 18px;font-size:13px;color:#475569;">A customer submitted a message via the website.</p>
    ${row("Name", name)}
    ${row("Email", email)}
    ${row("Phone", phone)}
    ${row("Subject", subject)}
    ${row("Submitted", createdAt || new Date().toLocaleString())}
    <div style="margin:14px 0 0;padding:14px 16px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:8px;">
      <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Message</div>
      <div style="font-size:13px;color:#0f172a;line-height:1.6;">${escapeHtml(body)}</div>
    </div>
  `, { title: "New Contact Message — Asan Global" });
  const text = `New contact message\n\nName: ${name || "—"}\nEmail: ${email || "—"}\nPhone: ${phone || "—"}\nSubject: ${subject || "—"}\nMessage: ${body || "—"}`;
  return { subject: outSubject, html, text };
}

/* ------------------------------------------------------------------
   Template: Shipment status updated (customer)
------------------------------------------------------------------ */
function shipmentStatusUpdatedCustomer({ customerName, trackingNumber, status, itemDescription, origin, destination, trackingUrl }) {
  const subject = `Your shipment ${trackingNumber || ""} is now: ${status || "updated"}`;
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Good news, ${escapeHtml(customerName || "there")}!</h2>
    <p style="margin:0 0 16px;font-size:13.5px;color:#475569;line-height:1.6;">
      The status of your shipment has been updated.
    </p>
    <div style="margin:0 0 18px;">${statusPill(status)}</div>
    ${row("Tracking Number", trackingNumber)}
    ${row("Item", itemDescription)}
    ${row("Route", origin ? `${origin} → ${destination}` : destination)}
    ${trackingUrl ? button(trackingUrl, "Track Your Shipment") : ""}
    <p style="margin:14px 0 0;font-size:12px;color:#64748b;">Thank you for shipping with Asan Global.</p>
  `, { title: "Shipment Update — Asan Global" });
  const text = `Hi ${customerName || "there"},\n\nYour shipment ${trackingNumber || ""} is now: ${status || "updated"}\nItem: ${itemDescription || "—"}\nRoute: ${origin ? origin + " → " : ""}${destination || "—"}\n\nTrack: ${trackingUrl || "https://asan-global-import-and-auto-sourcing-main/tracking.html"}\n\n— Asan Global Import Services`;
  return { subject, html, text };
}

/* ------------------------------------------------------------------
   Template: Shipment delivered (customer)
------------------------------------------------------------------ */
function shipmentDeliveredCustomer({ customerName, trackingNumber, itemDescription, origin, destination, deliveredAt }) {
  const subject = `🎉 Your shipment ${trackingNumber || ""} has been delivered!`;
  const html = shell(`
    <h2 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Delivered!</h2>
    <p style="margin:0 0 16px;font-size:13.5px;color:#475569;line-height:1.6;">
      Great news, ${escapeHtml(customerName || "there")} — your shipment has been
      successfully delivered.
    </p>
    <div style="margin:0 0 18px;">${statusPill("Delivered")}</div>
    ${row("Tracking Number", trackingNumber)}
    ${row("Item", itemDescription)}
    ${row("Route", origin ? `${origin} → ${destination}` : destination)}
    ${row("Delivered", deliveredAt || new Date().toLocaleString())}
    <p style="margin:16px 0 0;font-size:12.5px;color:#475569;line-height:1.6;">
      We hope everything arrived in perfect condition. If you have any issues,
      our support team is here to help.
    </p>
  `, { title: "Shipment Delivered — Asan Global" });
  const text = `Hi ${customerName || "there"},\n\nYour shipment ${trackingNumber || ""} has been delivered! 🎉\nItem: ${itemDescription || "—"}\nRoute: ${origin ? origin + " → " : ""}${destination || "—"}\nDelivered: ${deliveredAt || ""}\n\nThank you for shipping with Asan Global.`;
  return { subject, html, text };
}

module.exports = {
  quoteSubmittedCustomer,
  quoteSubmittedAdmin,
  messageSubmittedCustomer,
  messageSubmittedAdmin,
  shipmentStatusUpdatedCustomer,
  shipmentDeliveredCustomer,
  shell,
};
