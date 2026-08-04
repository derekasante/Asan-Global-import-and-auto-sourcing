/**
 * Asan Global — Mailer Provider Registry
 * ------------------------------------------------------------------
 * Defines a minimal provider contract so new providers (Resend,
 * SendGrid, Postmark, SES, …) can be plugged in without changing the
 * notification logic.
 *
 * Each provider must export:
 *   name   - string identifier
 *   async send({ to, from, subject, html, text }) -> Promise<result>
 *            Throws on failure; caller logs + never fails the request.
 *   async close() -> optional cleanup
 *
 * The registry looks up a provider by name and throws if unknown.
 */
const registry = {};

function registerProvider(provider) {
  if (!provider || !provider.name || typeof provider.send !== "function") {
    throw new Error("[mailer] Invalid provider. Must expose { name, send }.");
  }
  registry[provider.name] = provider;
}

function getProvider(name) {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`[mailer] Unknown email provider "${name}". ` +
      `Registered: ${Object.keys(registry).join(", ") || "none"}`);
  }
  return provider;
}

module.exports = { registerProvider, getProvider, registry };
