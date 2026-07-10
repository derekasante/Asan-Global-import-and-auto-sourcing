(function (global) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeInput(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  async function hashText(value) {
    if (typeof global.crypto?.subtle?.digest !== 'function') {
      return value;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(String(value ?? ''));
    const hashBuffer = await global.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const api = { escapeHtml, normalizeInput, hashText };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.securityUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
