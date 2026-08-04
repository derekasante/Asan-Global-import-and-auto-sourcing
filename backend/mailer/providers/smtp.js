/**
 * Asan Global — SMTP Email Provider (Nodemailer)
 * ------------------------------------------------------------------
 * Default "real" email provider. Credentials come from the server-side
 * environment only (SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS)
 * and are never exposed to the browser.
 *
 * Switch providers later by creating a new file in this folder and
 * registering it in backend/mailer/index.js — the notification logic
 * in backend/email/notifications.js stays unchanged.
 */
const nodemailer = require("nodemailer");

let transporter = null;

function createTransporter(config) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
    // Timeouts so a slow SMTP server never blocks the main request path
    // for the responder (email still runs fire-and-forget).
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporter;
}

function getTransporter(config) {
  if (!transporter) return createTransporter(config);
  return transporter;
}

const smtpProvider = {
  name: "smtp",

  /**
   * Send an email via SMTP.
   * @param {{to: string|string[], from: string, subject: string, html: string, text: string}} msg
   * @returns {Promise<object>} nodemailer sendMail result
   * @throws on failure so the caller can log (never fails the HTTP request)
   */
  async send(msg) {
    const transport = getTransporter(msg._config);
    const info = await transport.sendMail({
      from: msg.from,
      to: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text || "Please view this email in an HTML-capable client.",
    });
    return { provider: "smtp", messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  },

  async close() {
    if (transporter) {
      transporter.close();
      transporter = null;
    }
  },
};

module.exports = smtpProvider;
