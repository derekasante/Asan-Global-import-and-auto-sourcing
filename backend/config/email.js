/**
 * Asan Global — Email Configuration
 * ------------------------------------------------------------------
 * Loads and validates email-related environment variables.
 *
 * All provider API keys stay server-side (never exposed to the browser).
 * The provider is chosen via EMAIL_PROVIDER and can be swapped later
 * (smtp | log | resend | sendgrid | postmark) without touching the
 * notification logic in backend/email/notifications.js.
 *
 * Env vars:
 *   EMAIL_ENABLED        - "true" to enable sending (default "false")
 *   EMAIL_PROVIDER       - "smtp" | "log" (default "log" for dev/testing)
 *   SMTP_HOST            - SMTP server host (e.g. smtp.gmail.com)
 *   SMTP_PORT            - SMTP port (587 / 465 / 25)
 *   SMTP_SECURE          - "true" for port 465 (TLS), "false" for STARTTLS
 *   SMTP_USER            - SMTP username
 *   SMTP_PASS            - SMTP password / app password
 *   EMAIL_FROM           - "Sender Name <sender@example.com>"
 *   ADMIN_NOTIFY_EMAILS  - comma-separated admin recipients
 *   APP_BASE_URL         - base URL for tracking links in emails
 */
function loadEmailConfig() {
  const enabled = process.env.EMAIL_ENABLED === "true";

  return {
    enabled,
    provider: (process.env.EMAIL_PROVIDER || (enabled ? "smtp" : "log")).toLowerCase(),
    from: process.env.EMAIL_FROM || "Asan Global <noreply@asanglobal.com>",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    adminNotifyEmails: (process.env.ADMIN_NOTIFY_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5000",
  };
}

module.exports = { loadEmailConfig };
