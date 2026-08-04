/**
 * Asan Global — Mailer (public entry point)
 * ------------------------------------------------------------------
 * Registers available providers and exposes:
 *   - getProvider()         -> the provider chosen by EMAIL_PROVIDER
 *   - sendEmail(msg)        -> fire-and-forget wrapper (never throws,
 *                              logs failures)
 *   - sendNotification(...) -> high-level orchestration used by
 *                              backend/email/notifications.js
 *
 * Switching providers later (Resend, SendGrid, Postmark…) = create a new
 * file in backend/mailer/providers/ + register it here. The notification
 * logic never changes.
 */
const { loadEmailConfig } = require("../config/email");
const { registerProvider, getProvider } = require("./provider");
const logProvider = require("./providers/log");

// Register providers (smtp requires nodemailer, registered lazily to avoid
// a hard dependency for the log/test path).
registerProvider(logProvider);

let smtpProvider = null;
let resolvedConfig = null;

/** Load config once and register the SMTP provider if requested. */
function loadConfig() {
  if (resolvedConfig) return resolvedConfig;
  resolvedConfig = loadEmailConfig();
  if (resolvedConfig.provider === "smtp") {
    smtpProvider = require("./providers/smtp");
    registerProvider(smtpProvider);
  } else if (resolvedConfig.provider !== "log") {
    // Unknown provider configured — fall back to log and warn.
    console.warn(`[mailer] Unknown EMAIL_PROVIDER "${resolvedConfig.provider}" — falling back to "log".`);
    resolvedConfig.provider = "log";
  }
  return resolvedConfig;
}

/**
 * Resolve the active provider for this process.
 * Returns the provider instance and its config.
 */
function resolveProvider() {
  const config = loadConfig();
  let provider;
  try {
    provider = getProvider(config.provider);
  } catch (err) {
    console.warn("[mailer] Provider not registered:", err.message, "— using log provider.");
    provider = getProvider("log");
    config.provider = "log";
  }
  return { provider, config };
}

/**
 * Fire-and-forget email send. NEVER throws — failures are logged.
 * Used for transactional notifications; the DB operation is independent.
 *
 * @param {{to: string|string[], subject: string, html?: string, text?: string, boundary?: string}} msg
 * @returns {Promise<{sent: boolean, provider: string, messageId?: string, error?: string}>}
 */
async function sendEmail(msg) {
  const { provider, config } = resolveProvider();
  if (!config.enabled) {
    const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    console.log(`[mailer] Emails disabled (EMAIL_ENABLED=false) — would send to "${to}" subject="${msg.subject}"`);
    return { sent: false, provider: config.provider, skipped: "disabled" };
  }

  if (!msg.to || (Array.isArray(msg.to) && msg.to.length === 0)) {
    console.warn("[mailer] Skipping email — no recipient provided.");
    return { sent: false, provider: config.provider, skipped: "no-recipient" };
  }

  try {
    const result = await provider.send({
      to: msg.to,
      from: config.from,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      _config: config,
      _boundary: msg.boundary,
    });
    return { sent: true, provider: config.provider, messageId: result.messageId };
  } catch (err) {
    // Log and swallow — email must never fail the main request.
    console.error(`[mailer] Email sending FAILED (${config.provider}):`, err.message || err);
    return { sent: false, provider: config.provider, error: err.message || String(err) };
  }
}

/**
 * High-level helper used by notifications.js: sends a message to one or
 * many recipients using a pre-built template.
 */
async function sendNotification({ to, subject, html, text, boundary }) {
  // Normalize to an array for uniform logging below.
  const targets = Array.isArray(to) ? to : [to];
  // Fire each recipient through the provider (supports multi-recipient too).
  return sendEmail({ to: targets, subject, html, text, boundary });
}

module.exports = { sendEmail, sendNotification, resolveProvider, loadConfig };
