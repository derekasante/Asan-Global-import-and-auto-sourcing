/**
 * Asan Global — Log Email Provider (development / testing)
 * ------------------------------------------------------------------
 * "Sends" emails by writing them to the console. This is the default
 * provider so no real emails are sent during development/tests.
 *
 * It implements the exact same contract as the SMTP provider, so you can
 * switch to SMTP (or Resend, SendGrid, …) by changing EMAIL_PROVIDER.
 */
const logProvider = {
  name: "log",

  async send(msg) {
    const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    console.log("\n================ [EMAIL] LOG PROVIDER ================");
    console.log(`  From:    ${msg.from}`);
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${msg.subject}`);
    console.log(`  Bound:   ${msg._boundary || "n/a"}`);
    console.log("--------------------------------------------------------");
    if (msg.text) console.log(`  [TEXT]\n${msg.text}\n`);
    if (msg.html) console.log(`  [HTML] ${msg.html.length} chars (see below)\n`);
    if (msg.html) console.log(`--------------------------------------------------------\n${msg.html}\n`);
    console.log("========================================================\n");
    return { provider: "log", messageId: "log-" + Date.now(), to };
  },

  async close() {
    // nothing to clean up
  },
};

module.exports = logProvider;
