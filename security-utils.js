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

  // ---- Symmetric encryption helpers (AES-GCM via Web Crypto) ----
  // Used to encrypt data (e.g. chat messages) before it is written to
  // localStorage, so plaintext never sits at rest in the browser storage.
  // NOTE: this is a static, no-backend site — the key is derived from a
  // shared passphrase using PBKDF2, not exchanged out-of-band. That means
  // it protects data at rest (localStorage/devtools inspection) but is not
  // a substitute for real server-mediated end-to-end encryption.
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function base64ToBuf(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function deriveKey(passphrase, saltStr) {
    if (typeof global.crypto?.subtle?.importKey !== 'function') return null;
    const baseKey = await global.crypto.subtle.importKey(
      'raw',
      textEncoder.encode(String(passphrase || '')),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return global.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: textEncoder.encode(String(saltStr || 'asan-global-salt')),
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(key, plaintext) {
    if (!key) return { plain: String(plaintext ?? '') };
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const ct = await global.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(String(plaintext ?? ''))
    );
    return { iv: bufToBase64(iv), ct: bufToBase64(ct) };
  }

  async function decryptText(key, payload) {
    if (!payload) return '';
    if (payload.plain !== undefined) return payload.plain;
    if (!key || !payload.iv || !payload.ct) return '';
    try {
      const iv = base64ToBuf(payload.iv);
      const ctBuf = base64ToBuf(payload.ct);
      const plainBuf = await global.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBuf);
      return textDecoder.decode(plainBuf);
    } catch {
      return '[unable to decrypt]';
    }
  }

  const api = { escapeHtml, normalizeInput, hashText, deriveKey, encryptText, decryptText };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.securityUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
