/**
 * security-utils.js — Asan Global
 * Client-side security helpers: escaping, sanitisation, hashing,
 * input validation, rate limiting, and AES-GCM encryption.
 *
 * All functions are exposed on `window.securityUtils` and, when
 * bundled via CommonJS, as `module.exports`.
 *
 * IMPORTANT: this is a static, localStorage-backed site.
 * - Passwords are hashed with SHA-256 (Web Crypto) before storage.
 * - AES-GCM encryption protects data at rest (localStorage / DevTools).
 * - Neither replaces server-side authentication or a real database.
 *   When a backend is added, move auth and encryption server-side.
 */
(function (global) {
  'use strict';

  /* ================================================================
     ESCAPING & SANITISATION
  ================================================================ */

  /** Escape HTML special characters to prevent XSS. */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Trim and normalise a string input.
   * Collapses internal whitespace runs to a single space.
   */
  function normalizeInput(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Strip every character that is not a letter, digit, space, or
   * a small set of safe punctuation.  Use for names, addresses, etc.
   * Does NOT strip email-safe characters — use normalizeInput there.
   */
  function sanitizeText(value, maxLength) {
    const safe = String(value ?? '')
      .trim()
      .replace(/[<>"'`]/g, '')          // remove HTML-dangerous chars
      .replace(/\s+/g, ' ');            // collapse whitespace
    return maxLength ? safe.slice(0, maxLength) : safe;
  }

  /* ================================================================
     INPUT VALIDATORS
     Each returns { ok: boolean, message: string }
  ================================================================ */

  /** Non-empty string of minimum / maximum length. */
  function validateName(value, { min = 2, max = 100, label = 'Name' } = {}) {
    const v = normalizeInput(String(value ?? ''));
    if (!v)              return { ok: false, message: `${label} is required.` };
    if (v.length < min)  return { ok: false, message: `${label} must be at least ${min} characters.` };
    if (v.length > max)  return { ok: false, message: `${label} must be no longer than ${max} characters.` };
    if (/[<>"'`\\]/.test(v)) return { ok: false, message: `${label} contains invalid characters.` };
    return { ok: true, message: '' };
  }

  /** RFC-5321 lightweight email check. */
  function validateEmail(value) {
    const v = normalizeInput(String(value ?? '')).toLowerCase();
    if (!v) return { ok: false, message: 'Email address is required.' };
    /* Local part + @ + domain with at least one dot */
    if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(v)) {
      return { ok: false, message: 'Please enter a valid email address.' };
    }
    if (v.length > 254) return { ok: false, message: 'Email address is too long.' };
    return { ok: true, message: '' };
  }

  /**
   * International phone number.
   * Accepts optional leading +, digits, spaces, dashes, dots, parentheses.
   * Length: 7–20 characters (digits only after stripping formatting).
   */
  function validatePhone(value) {
    const v = normalizeInput(String(value ?? ''));
    if (!v) return { ok: false, message: 'Phone number is required.' };
    const digits = v.replace(/\D/g, '');
    if (digits.length < 7)  return { ok: false, message: 'Phone number is too short.' };
    if (digits.length > 15) return { ok: false, message: 'Phone number is too long.' };
    if (!/^[+\d\s\-().]+$/.test(v)) {
      return { ok: false, message: 'Phone number contains invalid characters.' };
    }
    return { ok: true, message: '' };
  }

  /**
   * Credit / debit card number.
   * Strips spaces, checks length 13–19 digits, runs Luhn algorithm.
   */
  function validateCardNumber(value) {
    const digits = String(value ?? '').replace(/\s/g, '');
    if (!digits) return { ok: false, message: 'Card number is required.' };
    if (!/^\d{13,19}$/.test(digits)) {
      return { ok: false, message: 'Card number must be 13–19 digits.' };
    }
    /* Luhn check */
    const sum = digits
      .split('')
      .reverse()
      .reduce((acc, d, i) => {
        let n = parseInt(d, 10);
        if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
        return acc + n;
      }, 0);
    if (sum % 10 !== 0) {
      return { ok: false, message: 'Card number appears invalid. Please check and try again.' };
    }
    return { ok: true, message: '' };
  }

  /** Card expiry in MM / YY or MM/YY format. Must not be in the past. */
  function validateCardExpiry(value) {
    const v = String(value ?? '').replace(/\s/g, '');
    if (!v) return { ok: false, message: 'Expiry date is required.' };
    const match = v.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return { ok: false, message: 'Expiry must be MM/YY.' };

    const month = parseInt(match[1], 10);
    const year  = parseInt('20' + match[2], 10);
    if (month < 1 || month > 12) return { ok: false, message: 'Invalid expiry month.' };

    const now   = new Date();
    const expDate = new Date(year, month); // 1st day of the month AFTER expiry
    if (expDate <= now) return { ok: false, message: 'This card has expired.' };

    return { ok: true, message: '' };
  }

  /** CVV: 3 or 4 digits. */
  function validateCvv(value) {
    const v = String(value ?? '').trim();
    if (!v) return { ok: false, message: 'CVV is required.' };
    if (!/^\d{3,4}$/.test(v)) return { ok: false, message: 'CVV must be 3 or 4 digits.' };
    return { ok: true, message: '' };
  }

  /**
   * Password strength.
   * Returns { ok, message, strength: 'weak'|'fair'|'strong'|'very-strong' }.
   */
  function validatePassword(value, { minLength = 8 } = {}) {
    const v = String(value ?? '');
    if (!v) return { ok: false, message: 'Password is required.', strength: 'weak' };
    if (v.length < minLength) {
      return { ok: false, message: `Password must be at least ${minLength} characters.`, strength: 'weak' };
    }

    let score = 0;
    if (/[a-z]/.test(v)) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/\d/.test(v))    score++;
    if (/[^a-zA-Z\d]/.test(v)) score++;
    if (v.length >= 12) score++;

    const levels = ['weak', 'weak', 'fair', 'strong', 'very-strong', 'very-strong'];
    const strength = levels[score] || 'weak';

    if (score < 2) {
      return { ok: false, message: 'Password is too weak. Add uppercase, numbers, or symbols.', strength };
    }
    return { ok: true, message: '', strength };
  }

  /**
   * Validate a tracking number in the format ASAN-XXX-NNN-YYYY.
   * Flexible enough to accept any ASAN-prefixed alphanumeric string.
   */
  function validateTrackingNumber(value) {
    const v = normalizeInput(String(value ?? '')).toUpperCase();
    if (!v) return { ok: false, message: 'Tracking number is required.' };
    if (!v.startsWith('ASAN-')) return { ok: false, message: 'Tracking numbers start with ASAN-.' };
    if (v.length < 8 || v.length > 40) {
      return { ok: false, message: 'Tracking number length is invalid.' };
    }
    if (!/^[A-Z0-9\-]+$/.test(v)) {
      return { ok: false, message: 'Tracking number contains invalid characters.' };
    }
    return { ok: true, message: '' };
  }

  /* ================================================================
     RATE LIMITER
     Prevents brute-force on login and form submissions.
     Uses localStorage keyed by action name.

     Usage:
       const check = rateLimiter.check('login', 5, 15 * 60 * 1000);
       if (!check.allowed) showError(`Too many attempts. Try again in ${check.retryAfterSeconds}s.`);
  ================================================================ */
  const rateLimiter = (function () {
    const KEY_PREFIX = 'ag_rl_';

    function _load(action) {
      try {
        return JSON.parse(localStorage.getItem(KEY_PREFIX + action) || 'null') ||
          { count: 0, windowStart: Date.now() };
      } catch { return { count: 0, windowStart: Date.now() }; }
    }

    function _save(action, state) {
      try { localStorage.setItem(KEY_PREFIX + action, JSON.stringify(state)); } catch {}
    }

    /**
     * Check and increment the rate limit counter.
     * @param {string} action       — unique key (e.g. 'login', 'checkout')
     * @param {number} maxAttempts  — max allowed attempts per window
     * @param {number} windowMs     — time window in milliseconds
     * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
     */
    function check(action, maxAttempts, windowMs) {
      const now   = Date.now();
      let state   = _load(action);

      /* Reset window if it has expired */
      if (now - state.windowStart > windowMs) {
        state = { count: 0, windowStart: now };
      }

      state.count++;
      _save(action, state);

      const allowed  = state.count <= maxAttempts;
      const remaining = Math.max(0, maxAttempts - state.count);
      const elapsed   = now - state.windowStart;
      const retryAfterSeconds = allowed ? 0 : Math.ceil((windowMs - elapsed) / 1000);

      return { allowed, remaining, retryAfterSeconds };
    }

    /** Reset the counter for an action (e.g. after a successful login). */
    function reset(action) {
      try { localStorage.removeItem(KEY_PREFIX + action); } catch {}
    }

    return { check, reset };
  })();

  /* ================================================================
     HASHING (SHA-256 via Web Crypto)
  ================================================================ */

  async function hashText(value) {
    if (typeof global.crypto?.subtle?.digest !== 'function') {
      /* Fallback: return value as-is (no crypto support — rare old browser) */
      return String(value ?? '');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(String(value ?? ''));
    const hashBuffer = await global.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ================================================================
     AES-GCM ENCRYPTION (symmetric, passphrase-derived)
     Used to encrypt data at rest in localStorage.
     Key is derived with PBKDF2 (100 000 iterations, SHA-256).
  ================================================================ */

  const _enc = new TextEncoder();
  const _dec = new TextDecoder();

  function _bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function _base64ToBuf(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function deriveKey(passphrase, saltStr) {
    if (typeof global.crypto?.subtle?.importKey !== 'function') return null;
    const baseKey = await global.crypto.subtle.importKey(
      'raw', _enc.encode(String(passphrase || '')), 'PBKDF2', false, ['deriveKey']
    );
    return global.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: _enc.encode(String(saltStr || 'asan-global-salt')), iterations: 100000, hash: 'SHA-256' },
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
      _enc.encode(String(plaintext ?? ''))
    );
    return { iv: _bufToBase64(iv), ct: _bufToBase64(ct) };
  }

  async function decryptText(key, payload) {
    if (!payload) return '';
    if (payload.plain !== undefined) return payload.plain;
    if (!key || !payload.iv || !payload.ct) return '';
    try {
      const iv      = _base64ToBuf(payload.iv);
      const ctBuf   = _base64ToBuf(payload.ct);
      const plainBuf = await global.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBuf);
      return _dec.decode(plainBuf);
    } catch { return '[unable to decrypt]'; }
  }

  /* ================================================================
     CONTENT SECURITY POLICY HELPER
     Call once on page load to log any CSP violations to the console
     so developers notice them during testing.
  ================================================================ */
  function initCspReporting() {
    if (typeof document === 'undefined') return;
    document.addEventListener('securitypolicyviolation', (e) => {
      console.warn('[CSP Violation]', {
        directive:   e.effectiveDirective,
        blockedUri:  e.blockedURI,
        sourceFile:  e.sourceFile,
        lineNumber:  e.lineNumber
      });
    });
  }

  /* ================================================================
     EXPORTS
  ================================================================ */
  const api = {
    /* Escaping / sanitisation */
    escapeHtml,
    normalizeInput,
    sanitizeText,

    /* Validators */
    validateName,
    validateEmail,
    validatePhone,
    validateCardNumber,
    validateCardExpiry,
    validateCvv,
    validatePassword,
    validateTrackingNumber,

    /* Rate limiter */
    rateLimiter,

    /* Crypto */
    hashText,
    deriveKey,
    encryptText,
    decryptText,

    /* Misc */
    initCspReporting
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.securityUtils = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
