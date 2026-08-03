/**
 * Asan Global — Payment Module Core
 * ---------------------------------------------------------------------------
 * Provider-agnostic invoice + payment layer.
 *
 * The design goal is to keep the UI fully decoupled from any single payment
 * gateway. Today the module persists invoices + payments to browser
 * localStorage (matching the rest of the app, which is a demo store). When a
 * real payment provider is connected, the gateway interface below is the ONLY
 * seam that needs to change — the UI, invoice model and success flow stay
 * identical.
 *
 * Future integration points (see REPORT):
 *   - AsanPayments.registerProvider(name, impl)  -> mount Hubtel / Paystack /
 *     Flutterwave / Stripe / PayPal etc.
 *   - AsanPayments.charge({invoiceId, method, ...}) -> replace the demo
 *     provider with a real gateway call.
 *   - PROVIDER_CONFIG -> where gateway API keys / secrets / env flags live
 *     (server-side only when real).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------ */
  var STORE_INVOICES = 'asan_invoices';
  var STORE_PAYMENTS = 'asan_payments';

  var STATUS = {
    PAID: 'paid',
    PENDING: 'pending',
    OVERDUE: 'overdue',
    REFUNDED: 'refunded',
    PARTIAL: 'partial',
  };

  var STATUS_LABEL = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    refunded: 'Refunded',
    partial: 'Partially Paid',
  };

  var STATUS_BADGE = {
    paid: 'pay-badge paid',
    pending: 'pay-badge pending',
    overdue: 'pay-badge overdue',
    refunded: 'pay-badge refunded',
    partial: 'pay-badge partial',
  };

  /* Payment methods offered (provider-agnostic categories). */
  var METHODS = [
    { key: 'card', label: 'Card', icon: 'fa-credit-card' },
    { key: 'mobile_money', label: 'Mobile Money', icon: 'fa-mobile-alt' },
    { key: 'bank_transfer', label: 'Bank Transfer', icon: 'fa-university' },
    { key: 'paypal', label: 'PayPal', icon: 'fab fa-paypal' },
  ];

  /* ------------------------------------------------------------------
   * Provider registry — provider-agnostic gateway abstraction
   * ------------------------------------------------------------------ */
  var providers = {};

  /**
   * Register a payment provider implementation.
   * impl must expose:
   *   - name           : display name
   *   - supportsMethod : function(methodKey) -> boolean
   *   - charge         : function({ invoice, method, details, user })
   *                        -> Promise<{ status, reference, redirectUrl? }>
   *                        (a real provider may return a redirect URL to the
   *                         gateway hosted checkout / a mobile prompt)
   */
  function registerProvider(name, impl) {
    providers[name] = impl;
  }

  /**
   * Demo provider — simulates a successful gateway charge so the whole flow
   * can be exercised end-to-end without any backend. Replace this with a real
   * provider (Hubtel / Paystack / Flutterwave / Stripe / PayPal) via
   * AsanPayments.registerProvider(...).
   */
  function demoProvider() {
    return {
      name: 'Demo (Sandbox)',
      supportsMethod: function () { return true; },
      charge: function (charge) {
        var invoice = charge.invoice;
        var amount = invoice.amount_due || invoice.total || 0;
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve({
              status: 'succeeded',
              reference: 'PY-' + Date.now().toString(36).toUpperCase(),
              redirectUrl: null,
              message: 'Demo gateway processed the payment (no real money moved).',
            });
          }, 900);
        });
      },
    };
  }
  registerProvider('demo', demoProvider());

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function uid() {
    return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function money(v) {
    return '$' + (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
  }
  function currentUser() {
    try { return JSON.parse(localStorage.getItem('asan_current_user') || 'null'); } catch (e) { return null; }
  }
  function isAdmin() {
    var u = currentUser();
    return !!(u && u.role === 'admin');
  }

  /* ------------------------------------------------------------------
   * Invoice model + store
   * ------------------------------------------------------------------ */
  function getInvoices() {
    return read(STORE_INVOICES, []);
  }
  function saveInvoices(list) {
    write(STORE_INVOICES, list);
  }
  function getInvoice(id) {
    return getInvoices().find(function (i) { return i.id === id; }) || null;
  }

  /**
   * Create an invoice from a shipment (or a free-form order).
   * shipment: { tracking, customer, email, item_description, make, model,
   *             origin, destination, importFee, customsFee, ... }
   */
  function createInvoice(options) {
    options = options || {};
    var shipment = options.shipment || {};
    var customer = options.customer || shipment.customer || 'Customer';
    var email = options.email || shipment.email || shipment.customer_email || '';

    var importFee = parseFloat(options.importFee ?? shipment.importFee ?? 0) || 0;
    var customsFee = parseFloat(options.customsFee ?? shipment.customsFee ?? 0) || 0;
    var serviceFee = parseFloat(options.serviceFee ?? 0) || 0;
    var total = importFee + customsFee + serviceFee;

    var invoice = {
      id: uid(),
      number: options.number || 'ASG-INV-' + Date.now().toString().slice(-6),
      tracking: shipment.tracking || options.tracking || '',
      customer: customer,
      email: email,
      description: options.description || shipment.item_description || (shipment.make + ' ' + shipment.model) || 'Shipment services',
      line_items: [
        { label: 'Import Fee', amount: importFee },
        { label: 'Customs Fee', amount: customsFee },
        { label: 'Service Fee', amount: serviceFee },
      ],
      import_fee: importFee,
      customs_fee: customsFee,
      service_fee: serviceFee,
      total: total,
      amount_due: total,
      amount_paid: 0,
      currency: 'USD',
      status: STATUS.PENDING,
      created_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 14 * 864e5).toISOString(),
      created_by: options.createdBy || 'system',
    };
    return invoice;
  }

  function upsertInvoice(invoice) {
    var list = getInvoices();
    var idx = list.findIndex(function (i) { return i.id === invoice.id; });
    if (idx === -1) list.unshift(invoice);
    else list[idx] = invoice;
    saveInvoices(list);
    return invoice;
  }

  function updateInvoiceStatus(id, status) {
    var list = getInvoices();
    var idx = list.findIndex(function (i) { return i.id === id; });
    if (idx === -1) return null;
    list[idx].status = status;
    saveInvoices(list);
    return list[idx];
  }

  function removeInvoice(id) {
    saveInvoices(getInvoices().filter(function (i) { return i.id !== id; }));
  }

  /* ------------------------------------------------------------------
   * Payment records + store
   * ------------------------------------------------------------------ */
  function getPayments() {
    return read(STORE_PAYMENTS, []);
  }
  function savePayments(list) {
    write(STORE_PAYMENTS, list);
  }
  function addPayment(record) {
    var list = getPayments();
    list.unshift(record);
    savePayments(list);
    return record;
  }

  /* ------------------------------------------------------------------
   * Charge flow — the single seam where a real gateway plugs in.
   * ------------------------------------------------------------------ */
  function getProvider() {
    // Prefer an explicitly configured provider, else the demo provider.
    var active = PROVIDER_CONFIG.activeProvider;
    return providers[active] || providers['demo'];
  }

  function listProviders() {
    return Object.keys(providers).map(function (k) { return providers[k]; });
  }

  /**
   * Process a payment for an invoice.
   * Returns a Promise resolving to the gateway result.
   */
  function charge(_charge) {
    var provider = getProvider();
    if (!provider || typeof provider.charge !== 'function') {
      return Promise.reject(new Error('No payment provider configured.'));
    }
    return provider.charge(_charge);
  }

  /* ------------------------------------------------------------------
   * Seed demo data (so the module is usable immediately)
   * ------------------------------------------------------------------ */
  function seed() {
    var existing = read(STORE_INVOICES, null);
    if (existing) return;

    var now = Date.now();
    var invoices = [
      {
        id: 'INV-SEED-001',
        number: 'ASG-INV-100001',
        tracking: 'ASAN-IMP-001-2024',
        customer: 'Kwame Asante',
        email: 'kwame@email.com',
        description: '2024 Toyota Land Cruiser — Import services',
        line_items: [
          { label: 'Import Fee', amount: 45000 },
          { label: 'Customs Fee', amount: 12000 },
          { label: 'Service Fee', amount: 2500 },
        ],
        import_fee: 45000, customs_fee: 12000, service_fee: 2500,
        total: 59500, amount_due: 59500, amount_paid: 0,
        currency: 'USD', status: STATUS.PENDING,
        created_at: new Date(now - 3 * 864e5).toISOString(),
        due_at: new Date(now + 11 * 864e5).toISOString(),
        created_by: 'system',
      },
      {
        id: 'INV-SEED-002',
        number: 'ASG-INV-100002',
        tracking: 'ASAN-IMP-003-2024',
        customer: 'Mike Chen',
        email: 'mike@email.com',
        description: '2024 Hyundai Ioniq 5 — Import services',
        line_items: [
          { label: 'Import Fee', amount: 32000 },
          { label: 'Customs Fee', amount: 8000 },
          { label: 'Service Fee', amount: 1500 },
        ],
        import_fee: 32000, customs_fee: 8000, service_fee: 1500,
        total: 41500, amount_due: 41500, amount_paid: 0,
        currency: 'USD', status: STATUS.OVERDUE,
        created_at: new Date(now - 20 * 864e5).toISOString(),
        due_at: new Date(now - 6 * 864e5).toISOString(),
        created_by: 'system',
      },
      {
        id: 'INV-SEED-003',
        number: 'ASG-INV-100003',
        tracking: 'ASAN-IMP-002-2024',
        customer: 'Sarah Johnson',
        email: 'sarah@email.com',
        description: '2024 Mercedes-Benz S-Class — Import services',
        line_items: [
          { label: 'Import Fee', amount: 68000 },
          { label: 'Customs Fee', amount: 15000 },
          { label: 'Service Fee', amount: 3000 },
        ],
        import_fee: 68000, customs_fee: 15000, service_fee: 3000,
        total: 86000, amount_due: 0, amount_paid: 86000,
        currency: 'USD', status: STATUS.PAID,
        created_at: new Date(now - 8 * 864e5).toISOString(),
        due_at: new Date(now + 6 * 864e5).toISOString(),
        created_by: 'system',
      },
    ];
    saveInvoices(invoices);

    var payments = [
      {
        id: 'PY-SEED-001',
        reference: 'PY-SEED-001',
        invoice_id: 'INV-SEED-003',
        invoice_number: 'ASG-INV-100003',
        tracking: 'ASAN-IMP-002-2024',
        customer: 'Sarah Johnson',
        method: 'card',
        method_label: 'Card',
        provider: 'demo',
        amount: 86000,
        currency: 'USD',
        status: 'succeeded',
        message: 'Payment completed',
        created_at: new Date(now - 5 * 864e5).toISOString(),
      },
    ];
    savePayments(payments);
  }

  /* ------------------------------------------------------------------
   * Provider configuration (server-side secrets when real providers are
   * connected — never hardcode live keys in the browser).
   * ------------------------------------------------------------------ */
  var PROVIDER_CONFIG = {
    activeProvider: 'demo', // 'demo' | 'hubtel' | 'paystack' | 'flutterwave' | 'stripe' | 'paypal'
    // Placeholder for future real-provider config (e.g. env vars via a
    // backend /api/payments/config endpoint — never inlined).
    config: {},
  };

  /* ------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------ */
  window.AsanPayments = {
    STATUS: STATUS,
    STATUS_LABEL: STATUS_LABEL,
    STATUS_BADGE: STATUS_BADGE,
    METHODS: METHODS,
    PROVIDER_CONFIG: PROVIDER_CONFIG,
    // store
    getInvoices: getInvoices,
    getInvoice: getInvoice,
    createInvoice: createInvoice,
    upsertInvoice: upsertInvoice,
    updateInvoiceStatus: updateInvoiceStatus,
    removeInvoice: removeInvoice,
    getPayments: getPayments,
    addPayment: addPayment,
    // gateway
    registerProvider: registerProvider,
    listProviders: listProviders,
    getProvider: getProvider,
    charge: charge,
    // helpers
    money: money,
    fmtDate: fmtDate,
    esc: esc,
    isAdmin: isAdmin,
    currentUser: currentUser,
  };

  seed();
})();
