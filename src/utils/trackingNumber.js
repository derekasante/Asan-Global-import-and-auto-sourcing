const crypto = require('crypto');

/**
 * Generates a unique tracking number: AGI-YYYYMMDD-XXXXXXXX
 * Used as fallback when DB function is unavailable.
 */
function generateTrackingNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `AGI-${date}-${random}`;
}

module.exports = { generateTrackingNumber };
