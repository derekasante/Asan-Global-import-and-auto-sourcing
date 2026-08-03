/**
 * Asan Global — Analytics & Reporting Module
 * ---------------------------------------------------------------------------
 * Dependency-free analytics dashboard. Reads from the same localStorage stores
 * the rest of the app uses, so it works immediately with demo data and renders
 * real data when those stores are populated by admin actions (create shipment
 * via POST /api/shipments, payments via AsanPayments, etc.).
 *
 * Demo seeding only runs when a store is empty — real data is never overwritten.
 *
 * Data access is routed through the DATA_SOURCES adapter layer below. When real
 * analytics backend endpoints are available, swap an adapter's `load` to fetch
 * them and the dashboard keeps working unchanged (see FUTURE_BACKEND_APIS).
 *
 * Exports: CSV is generated client-side; Excel writes a real .xls (SpreadsheetML);
 * PDF opens a print-friendly report window (use "Save as PDF").
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  var STORE_SHIPMENTS = 'asan_imports';
  var STORE_QUOTES = 'asan_quotes';
  var STORE_MESSAGES = 'asan_messages';
  var STORE_PAYMENTS = 'asan_payments';
  var STORE_INVOICES = 'asan_invoices';

  var API_BASE = 'http://localhost:5000';

  /* ------------------------------------------------------------------
   * Documented future backend APIs that would improve analytics.
   * These do NOT exist today and are NEVER called by this module.
   * ------------------------------------------------------------------ */
  var FUTURE_BACKEND_APIS = [
    {
      method: 'GET',
      path: '/api/analytics/summary',
      purpose: 'Return KPI totals (shipments, delivered, in_transit, pending_quotes, revenue, customers, messages, growth) for the filters',
      uses: 'Backfill the KPI cards exactly across all historical data',
    },
    {
      method: 'GET',
      path: '/api/analytics/shipments/timeseries?groupBy=month&range=...',
      purpose: 'Monthly shipment counts',
      uses: 'Monthly shipments chart',
    },
    {
      method: 'GET',
      path: '/api/analytics/revenue/timeseries?groupBy=month&range=...',
      purpose: 'Monthly revenue from payments/invoices that are really paid',
      uses: 'Monthly revenue chart + revenue KPI',
    },
    {
      method: 'GET',
      path: '/api/analytics/shipments/status?range=...',
      purpose: 'Count of shipments per status',
      uses: 'Shipment status distribution chart',
    },
    {
      method: 'GET',
      path: '/api/analytics/shipments/service?range=...',
      purpose: 'Count of shipments per service type',
      uses: 'Services distribution chart',
    },
    {
      method: 'GET',
      path: '/api/analytics/shipments/destinations?limit=10&range=...',
      purpose: 'Top destination countries with shipment counts',
      uses: 'Top destinations chart',
    },
    {
      method: 'GET',
      path: '/api/analytics/customers/count?range=...',
      purpose: 'Unique customer count (and new-customer delta for growth)',
      uses: 'Customers KPI + growth %',
    },
    {
      method: 'GET',
      path: '/api/analytics/reports?format=csv|pdf|excel',
      purpose: 'Server-generated, authoritative report export (respecting filters)',
      uses: 'Replace the client-side CSV export and the PDF/Excel placeholders with a real backend-generated file',
    },
  ];

  /* Shipment statuses in workflow order (labels used across the app). */
  var STATUS_ORDER = [
    'Order Received', 'Payment Confirmed', 'Processing', 'Purchased', 'Packed',
    'Ready for Shipment', 'Shipped', 'In Transit', 'Customs Clearance',
    'Arrived in Ghana', 'Out for Delivery', 'Delivered',
  ];

  var STATUS_COLORS = {
    'Order Received': '#64748b', 'Payment Confirmed': '#1d4ed8', 'Processing': '#3b82f6',
    'Purchased': '#7c3aed', 'Packed': '#8b5cf6', 'Ready for Shipment': '#db2777',
    'Shipped': '#0284c7', 'In Transit': '#f59e0b', 'Customs Clearance': '#ec4899',
    'Arrived in Ghana': '#059669', 'Out for Delivery': '#10b981', 'Delivered': '#16a34a',
  };

  var SERVICE_COLORS = {
    'Vehicle Import': '#2563eb', 'Vehicle Sourcing': '#7c3aed', 'Appliances': '#0891b2',
    'General Cargo': '#f59e0b', 'Other': '#64748b',
  };

  var DEST_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5', '#db2777', '#0d9488', '#9333ea'];

  var KPI_ICON = {
    shipments: { bg: 'blue', icon: 'fa-ship' },
    delivered: { bg: 'green', icon: 'fa-circle-check' },
    transit: { bg: 'amber', icon: 'fa-route' },
    quotes: { bg: 'purple', icon: 'fa-file-signature' },
    revenue: { bg: 'teal', icon: 'fa-sack-dollar' },
    customers: { bg: 'indigo', icon: 'fa-users' },
    messages: { bg: 'rose', icon: 'fa-comments' },
    growth: { bg: 'gold', icon: 'fa-arrow-trend-up' },
  };

  /* Current filter state */
  var filters = {
    range: '90d', // '30d' | '90d' | '12m' | 'all'
    start: null,
    end: null,
    service: 'All',
    status: 'All',
  };

  var allShipments = [];
  var allQuotes = [];
  var allMessages = [];
  var allPayments = [];
  var allInvoices = [];
  var backendOnline = false;

  /* ------------------------------------------------------------------
   * Data layer
   * ------------------------------------------------------------------ */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function getUsers() {
    return read('asan_current_user') || null;
  }

  function loadLocalData() {
    allShipments = read(STORE_SHIPMENTS, []);
    allQuotes = read(STORE_QUOTES, []);
    allMessages = read(STORE_MESSAGES, []);
    allPayments = read(STORE_PAYMENTS, []);
    allInvoices = read(STORE_INVOICES, []);
  }

  /* ------------------------------------------------------------------
   * Demo data seeding
   * ------------------------------------------------------------------
   * Seeds a realistic store only when the matching localStorage key is
   * empty (or absent). Real user data is never overwritten. Spread so a
   * fresh dashboard has meaningful revenue, shipments, quotes, messages
   * and payments to chart immediately.
   * ------------------------------------------------------------------ */
  function seedDemoData() {
    if (read(STORE_SHIPMENTS, null) === null) {
      var now = Date.now();
      var days = function (n) { return new Date(now - n * 864e5).toISOString(); };
      var seeds = [
        { id: 1, tracking: 'ASAN-IMP-001-2024', customer: 'Kwame Asante', customer_name: 'Kwame Asante', email: 'kwame@email.com', phone: '+233 24 000 0001', item: '2024 Toyota Land Cruiser', item_description: '2024 Toyota Land Cruiser', origin: 'Japan', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Customs Clearance', value: '$85,000', staff: 'Maria Garcia', created: days(3) },
        { id: 2, tracking: 'ASAN-IMP-002-2024', customer: 'Sarah Johnson', customer_name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+233 24 000 0002', item: '2024 Mercedes-Benz S-Class', item_description: '2024 Mercedes-Benz S-Class', origin: 'Germany', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Delivered', value: '$115,000', staff: 'James Wilson', created: days(6) },
        { id: 3, tracking: 'ASAN-IMP-003-2024', customer: 'Mike Chen', customer_name: 'Mike Chen', email: 'mike@email.com', phone: '+233 24 000 0003', item: '2024 Hyundai Ioniq 5', item_description: '2024 Hyundai Ioniq 5', origin: 'South Korea', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'In Transit', value: '$52,000', staff: 'Emily Brown', created: days(1) },
        { id: 4, tracking: 'ASAN-IMP-004-2024', customer: 'Ahmed Al-Rashid', customer_name: 'Ahmed Al-Rashid', email: 'ahmed@email.com', phone: '+233 24 000 0004', item: '2024 Ford F-150', item_description: '2024 Ford F-150', origin: 'USA', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Processing', value: '$65,000', staff: 'David Lee', created: days(10) },
        { id: 5, tracking: 'ASAN-IMP-005-2024', customer: 'William Thompson', customer_name: 'William Thompson', email: 'william@email.com', phone: '+233 24 000 0005', item: '2024 Rolls-Royce Phantom', item_description: '2024 Rolls-Royce Phantom', origin: 'UK', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Shipped', value: '$450,000', staff: 'Sophie Martin', created: days(2) },
        { id: 6, tracking: 'ASAN-IMP-006-2024', customer: 'Ama Osei', customer_name: 'Ama Osei', email: 'ama@email.com', phone: '+233 24 111 2222', item: 'Double-door refrigerator', item_description: 'Double-door refrigerator', origin: 'China', destination: 'Ghana', serviceType: 'Appliances', service_type: 'Appliances', status: 'Delivered', value: '$9,000', staff: 'Maria Garcia', created: days(45) },
        { id: 7, tracking: 'ASAN-IMP-007-2024', customer: 'Kofi Boateng', customer_name: 'Kofi Boateng', email: 'kofi@email.com', phone: '+233 24 333 4444', item: 'Chevrolet Suburban', item_description: 'Chevrolet Suburban', origin: 'USA', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Delivered', value: '$78,000', staff: 'James Wilson', created: days(20) },
        { id: 8, tracking: 'ASAN-IMP-008-2024', customer: 'Nana Adjei', customer_name: 'Nana Adjei', email: 'nana@email.com', phone: '+233 24 555 6666', item: 'General household cargo', item_description: 'General household cargo', origin: 'China', destination: 'Ghana', serviceType: 'General Cargo', service_type: 'General Cargo', status: 'Out for Delivery', value: '$12,000', staff: 'Emily Brown', created: days(60) },
        { id: 9, tracking: 'ASAN-IMP-009-2024', customer: 'Efua Mensah', customer_name: 'Efua Mensah', email: 'efua@email.com', phone: '+233 24 777 8888', item: '2024 Honda CR-V', item_description: '2024 Honda CR-V', origin: 'Japan', destination: 'Ghana', serviceType: 'Vehicle Sourcing', service_type: 'Vehicle Sourcing', status: 'Arrived in Ghana', value: '$42,000', staff: 'David Lee', created: days(75) },
        { id: 10, tracking: 'ASAN-IMP-010-2024', customer: 'Yaw Asare', customer_name: 'Yaw Asare', email: 'yaw@email.com', phone: '+233 24 999 0000', item: '2024 BMW X5', item_description: '2024 BMW X5', origin: 'Germany', destination: 'Ghana', serviceType: 'Vehicle Import', service_type: 'Vehicle Import', status: 'Ready for Shipment', value: '$88,000', staff: 'Sophie Martin', created: days(90) },
      ];
      try { localStorage.setItem(STORE_SHIPMENTS, JSON.stringify(seeds)); } catch (e) {}
    }

    if (read(STORE_QUOTES, null) === null) {
      var qnow = Date.now();
      var qd = function (n) { return new Date(qnow - n * 864e5).toISOString(); };
      var quotes = [
        { id: 1, name: 'John Mensah', email: 'john@email.com', phone: '+233 24 111 1111', service: 'Vehicle Import', origin: 'Japan', destination: 'Ghana', vehicleDetails: 'Toyota RAV4 2023', created: qd(2) },
        { id: 2, name: 'Ama Osei', email: 'ama@email.com', phone: '+233 24 222 2222', service: 'Vehicle Sourcing', origin: 'USA', destination: 'Ghana', vehicleDetails: 'Chevrolet Suburban', created: qd(1) },
        { id: 3, name: 'Kofi Boateng', email: 'kofi@email.com', phone: '+233 24 333 3333', service: 'Appliances', origin: 'China', destination: 'Ghana', vehicleDetails: 'Double-door refrigerator', created: qd(0) },
        { id: 4, name: 'Akosua Dede', email: 'akosua@email.com', phone: '+233 24 444 4444', service: 'General Cargo', origin: 'UK', destination: 'Ghana', vehicleDetails: 'Household goods', created: qd(15) },
      ];
      try { localStorage.setItem(STORE_QUOTES, JSON.stringify(quotes)); } catch (e) {}
    }

    if (read(STORE_MESSAGES, null) === null) {
      var mnow = Date.now();
      var md = function (n) { return new Date(mnow - n * 864e5).toISOString(); };
      var messages = [
        { id: 1, name: 'John Mensah', email: 'john@email.com', phone: '+233 24 111 1111', subject: 'Tracking query', body: 'Where is my shipment ASAN-IMP-001-2024? Has it cleared customs yet?', status: 'New', created: md(1) },
        { id: 2, name: 'Ama Osei', email: 'ama@email.com', phone: '+233 24 222 2222', subject: 'Payment confirmation', body: 'I have completed the payment for my import. Please confirm.', status: 'New', created: md(5) },
        { id: 3, name: 'Kofi Boateng', email: 'kofi@email.com', phone: '+233 24 333 3333', subject: 'Quote follow-up', body: 'Do you offer door-to-door delivery for appliances?', status: 'Read', created: md(8) },
        { id: 4, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+233 24 444 4444', subject: 'Delivery received', body: 'My S-Class arrived perfectly. Thank you for the great service!', status: 'Resolved', created: md(12) },
      ];
      try { localStorage.setItem(STORE_MESSAGES, JSON.stringify(messages)); } catch (e) {}
    }

    if (read(STORE_INVOICES, null) === null) {
      var inow = Date.now();
      var id = function (n) { return new Date(inow - n * 864e5).toISOString(); };
      var invoices = [
        { id: 'INV-SEED-001', number: 'ASG-INV-100001', tracking: 'ASAN-IMP-001-2024', customer: 'Kwame Asante', email: 'kwame@email.com', description: '2024 Toyota Land Cruiser — Import services', total: 59500, amount_paid: 0, amount_due: 59500, currency: 'USD', status: 'pending', created_at: id(3), due_at: id(-11), created_by: 'system' },
        { id: 'INV-SEED-002', number: 'ASG-INV-100002', tracking: 'ASAN-IMP-003-2024', customer: 'Mike Chen', email: 'mike@email.com', description: '2024 Hyundai Ioniq 5 — Import services', total: 41500, amount_paid: 0, amount_due: 41500, currency: 'USD', status: 'pending', created_at: id(1), due_at: id(-13), created_by: 'system' },
        { id: 'INV-SEED-003', number: 'ASG-INV-100003', tracking: 'ASAN-IMP-002-2024', customer: 'Sarah Johnson', email: 'sarah@email.com', description: '2024 Mercedes-Benz S-Class — Import services', total: 86000, amount_paid: 86000, amount_due: 0, currency: 'USD', status: 'paid', created_at: id(8), due_at: id(-6), created_by: 'system' },
        { id: 'INV-SEED-004', number: 'ASG-INV-100004', tracking: 'ASAN-IMP-007-2024', customer: 'Kofi Boateng', email: 'kofi@email.com', description: 'Chevrolet Suburban — Import services', total: 78000, amount_paid: 78000, amount_due: 0, currency: 'USD', status: 'paid', created_at: id(20), due_at: id(-6), created_by: 'system' },
        { id: 'INV-SEED-005', number: 'ASG-INV-100005', tracking: 'ASAN-IMP-006-2024', customer: 'Ama Osei', email: 'ama@email.com', description: 'Double-door refrigerator — Import services', total: 9000, amount_paid: 9000, amount_due: 0, currency: 'USD', status: 'paid', created_at: id(45), due_at: id(-31), created_by: 'system' },
      ];
      try { localStorage.setItem(STORE_INVOICES, JSON.stringify(invoices)); } catch (e) {}
    }

    if (read(STORE_PAYMENTS, null) === null) {
      var pnow = Date.now();
      var pd = function (n) { return new Date(pnow - n * 864e5).toISOString(); };
      var payments = [
        { id: 'PY-SEED-001', reference: 'PY-SEED-001', invoice_id: 'INV-SEED-003', invoice_number: 'ASG-INV-100003', tracking: 'ASAN-IMP-002-2024', customer: 'Sarah Johnson', method: 'card', method_label: 'Card', provider: 'demo', amount: 86000, currency: 'USD', status: 'succeeded', message: 'Payment completed', created_at: pd(8) },
        { id: 'PY-SEED-002', reference: 'PY-SEED-002', invoice_id: 'INV-SEED-004', invoice_number: 'ASG-INV-100004', tracking: 'ASAN-IMP-007-2024', customer: 'Kofi Boateng', method: 'mobile_money', method_label: 'Mobile Money', provider: 'demo', amount: 78000, currency: 'USD', status: 'succeeded', message: 'Payment completed', created_at: pd(20) },
        { id: 'PY-SEED-003', reference: 'PY-SEED-003', invoice_id: 'INV-SEED-005', invoice_number: 'ASG-INV-100005', tracking: 'ASAN-IMP-006-2024', customer: 'Ama Osei', method: 'bank_transfer', method_label: 'Bank Transfer', provider: 'demo', amount: 9000, currency: 'USD', status: 'succeeded', message: 'Payment completed', created_at: pd(45) },
      ];
      try { localStorage.setItem(STORE_PAYMENTS, JSON.stringify(payments)); } catch (e) {}
    }
  }

  /* ------------------------------------------------------------------
   * Data adapters (documented, extensible)
   * ------------------------------------------------------------------
   * Each source knows how to read a dataset. By default they read from
   * localStorage (the same stores the rest of the app uses). When a real
   * analytics backend endpoint is added, swap the `load` of one adapter to
   * fetch it (e.g. `return fetch('/api/analytics/shipments').then(r=>r.json())`).
   * The dashboard calls `loadAll()` and reads the same shape, so nothing
   * else changes. None of the FUTURE_BACKEND_APIS are called today.
   * ------------------------------------------------------------------ */
  var DATA_SOURCES = {
    shipments: {
      key: STORE_SHIPMENTS,
      load: function () { return Promise.resolve(read(STORE_SHIPMENTS, [])); },
      futureApi: '/api/analytics/summary',
      notes: 'Local shipments from the app store. Future: GET /api/analytics/shipments.',
    },
    quotes: {
      key: STORE_QUOTES,
      load: function () { return Promise.resolve(read(STORE_QUOTES, [])); },
      futureApi: '/api/analytics/quotes',
      notes: 'Local quote requests. Future: GET /api/analytics/quotes.',
    },
    messages: {
      key: STORE_MESSAGES,
      load: function () { return Promise.resolve(read(STORE_MESSAGES, [])); },
      futureApi: '/api/analytics/messages',
      notes: 'Local contact messages. Future: GET /api/analytics/messages.',
    },
    payments: {
      key: STORE_PAYMENTS,
      load: function () { return Promise.resolve(read(STORE_PAYMENTS, [])); },
      futureApi: '/api/analytics/revenue',
      notes: 'Local succeeded payments. Future: GET /api/analytics/revenue.',
    },
    invoices: {
      key: STORE_INVOICES,
      load: function () { return Promise.resolve(read(STORE_INVOICES, [])); },
      futureApi: '/api/analytics/revenue',
      notes: 'Local invoices (fallback for revenue). Future: GET /api/analytics/revenue.',
    },
  };

  /** Load every dataset through the adapter layer (Promise-based). */
  function loadAll() {
    return Promise.all([
      DATA_SOURCES.shipments.load(),
      DATA_SOURCES.quotes.load(),
      DATA_SOURCES.messages.load(),
      DATA_SOURCES.payments.load(),
      DATA_SOURCES.invoices.load(),
    ]).then(function (results) {
      allShipments = results[0];
      allQuotes = results[1];
      allMessages = results[2];
      allPayments = results[3];
      allInvoices = results[4];
    });
  }

  /**
   * Attempt to load live data from the existing verified public endpoints.
   * Only endpoints we KNOW exist are used (see backend/server.js):
   *   GET /health, GET /api/shipments/:trackingNumber,
   *   GET /api/tracking-events/:shipmentId
   * There is NO list-all-shipments endpoint, so we keep the localStorage
   * store as the primary dataset and only use the backend to check presence.
   */
  function checkBackend() {
    var chip = document.getElementById('anBackendChip');
    fetch(API_BASE + '/health')
      .then(function (r) { return r.json(); })
      .then(function () {
        backendOnline = true;
        chip.className = 'an-live-chip live';
        chip.innerHTML = '<i class="fas fa-plug" style="font-size:10px;"></i><span>Backend online</span>';
      })
      .catch(function () {
        chip.className = 'an-live-chip demo';
        chip.innerHTML = '<i class="fas fa-plug" style="font-size:10px;"></i><span>Demo mode</span>';
      });
  }

  /* ------------------------------------------------------------------
   * Filter utilities
   * ------------------------------------------------------------------ */
  function rangeBounds() {
    var now = Date.now();
    var start = null;
    if (filters.range === '30d') start = new Date(now - 30 * 864e5);
    else if (filters.range === '90d') start = new Date(now - 90 * 864e5);
    else if (filters.range === '12m') start = new Date(now - 365 * 864e5);
    if (filters.start) start = new Date(filters.start);
    return { start: start, end: new Date(filters.end || now) };
  }

  function inRange(dateIso) {
    var d = new Date(dateIso);
    if (isNaN(d.getTime())) return true; // unknown date -> keep (best effort)
    var b = rangeBounds();
    if (b.start && d < b.start) return false;
    if (b.end && d > b.end) return false;
    return true;
  }

  function matchesFilters(s) {
    var okService = filters.service === 'All' || (s.serviceType || '') === filters.service;
    var okStatus = filters.status === 'All' || (s.status || '') === filters.status;
    return okService && okStatus && inRange(s.created);
  }

  /* ------------------------------------------------------------------
   * KPI computation
   * ------------------------------------------------------------------ */
  function normStatus(st) {
    if (!st) return 'Pending';
    var map = {
      'Pending': 'Order Received', 'order_received': 'Order Received',
      'Documentation': 'Processing', 'payment_confirmed': 'Payment Confirmed',
      'purchased': 'Purchased', 'packed': 'Packed',
      'ready_for_shipment': 'Ready for Shipment', 'shipped': 'Shipped',
      'in_transit': 'In Transit', 'customs_clearance': 'Customs Clearance',
      'arrived_in_ghana': 'Arrived in Ghana', 'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
    };
    // Title-case any raw backend status
    var title = String(st).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return map[st] || map[title] || map[String(st).toLowerCase()] || title;
  }

  function deliveryStatuses() { return ['Delivered']; }
  function transitStatuses() { return ['Shipped', 'In Transit', 'Customs Clearance', 'Arrived in Ghana', 'Out for Delivery']; }

/**
   * Compute a percentage change between `current` and `previous` counts.
   * Returns a rounded integer; 0 previous yields null (no data to compare).
   */
  function pctChange(current, previous) {
    if (!previous) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  function computeKpis(shipments, quotes, payments, invoices) {
    var delivered = shipments.filter(function (s) { return deliveryStatuses().indexOf(normStatus(s.status)) !== -1; }).length;
    var inTransit = shipments.filter(function (s) { return transitStatuses().indexOf(normStatus(s.status)) !== -1; }).length;
    var pendingQuotes = quotes.length;

    var totalCollected = 0;
    payments.forEach(function (p) {
      if (p.status === 'succeeded') totalCollected += parseFloat(p.amount) || 0;
    });
    // Fall back to paid invoices amount if payments store empty but invoices exist
    if (!totalCollected && invoices.length) {
      invoices.forEach(function (iv) {
        if (iv.status === 'paid') totalCollected += parseFloat(iv.amount_paid || iv.total || 0) || 0;
      });
    }

    var customers = {};
    shipments.forEach(function (s) { if (s.customer || s.customer_name) customers[s.customer || s.customer_name] = 1; });
    quotes.forEach(function (q) { if (q.name) customers[q.name] = 1; });
    var customerCount = Object.keys(customers).length;

    // ---- Period-over-period trends (last 30d vs prior 30d) ----
    var now = Date.now();
    var inLast30 = function (rows, dateKey) {
      return rows.filter(function (r) { return new Date(r[dateKey] || 0).getTime() >= now - 30 * 864e5; }).length;
    };
    var inPrev30 = function (rows, dateKey) {
      return rows.filter(function (r) {
        var t = new Date(r[dateKey] || 0).getTime();
        return t >= now - 60 * 864e5 && t < now - 30 * 864e5;
      }).length;
    };

    // Shipments growth (primary KPI)
    var growth = pctChange(inLast30(shipments, 'created'), inPrev30(shipments, 'created'));
    if (growth === null) growth = inLast30(shipments, 'created') > 0 ? 100 : 0;

    // Revenue trend (succeeded payments, 30d windows)
    var pay30 = payments.filter(function (p) {
      return p.status === 'succeeded' && new Date(p.created_at || 0).getTime() >= now - 30 * 864e5;
    }).reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var payPrev30 = payments.filter(function (p) {
      var t = new Date(p.created_at || 0).getTime();
      return p.status === 'succeeded' && t >= now - 60 * 864e5 && t < now - 30 * 864e5;
    }).reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var revenueTrend = pctChange(pay30, payPrev30);

    // Delivered trend
    var del30 = shipments.filter(function (s) { return deliveryStatuses().indexOf(normStatus(s.status)) !== -1 && new Date(s.created || 0).getTime() >= now - 30 * 864e5; }).length;
    var delPrev30 = shipments.filter(function (s) {
      var t = new Date(s.created || 0).getTime();
      return deliveryStatuses().indexOf(normStatus(s.status)) !== -1 && t >= now - 60 * 864e5 && t < now - 30 * 864e5;
    }).length;
    var deliveredTrend = pctChange(del30, delPrev30);

    // Transit trend
    var tr30 = shipments.filter(function (s) { return transitStatuses().indexOf(normStatus(s.status)) !== -1 && new Date(s.created || 0).getTime() >= now - 30 * 864e5; }).length;
    var trPrev30 = shipments.filter(function (s) {
      var t = new Date(s.created || 0).getTime();
      return transitStatuses().indexOf(normStatus(s.status)) !== -1 && t >= now - 60 * 864e5 && t < now - 30 * 864e5;
    }).length;
    var transitTrend = pctChange(tr30, trPrev30);

    // Customers trend (unique customers in last 30d vs prior 30d)
    var cust30 = {};
    shipments.forEach(function (s) { if (new Date(s.created || 0).getTime() >= now - 30 * 864e5) { if (s.customer || s.customer_name) cust30[s.customer || s.customer_name] = 1; } });
    quotes.forEach(function (q) { if (new Date(q.created || 0).getTime() >= now - 30 * 864e5) { if (q.name) cust30[q.name] = 1; } });
    var custPrev30 = {};
    shipments.forEach(function (s) {
      var t = new Date(s.created || 0).getTime();
      if (t >= now - 60 * 864e5 && t < now - 30 * 864e5) { if (s.customer || s.customer_name) custPrev30[s.customer || s.customer_name] = 1; }
    });
    quotes.forEach(function (q) {
      var t = new Date(q.created || 0).getTime();
      if (t >= now - 60 * 864e5 && t < now - 30 * 864e5) { if (q.name) custPrev30[q.name] = 1; }
    });
    var customersTrend = pctChange(Object.keys(cust30).length, Object.keys(custPrev30).length);

    return {
      shipments: shipments.length,
      delivered: delivered,
      transit: inTransit,
      quotes: pendingQuotes,
      revenue: totalCollected,
      customers: customerCount,
      messages: allMessages.length,
      growth: growth,
      // trend data (percentage change vs previous 30d, null = no prior data)
      trends: {
        shipments: pctChange(inLast30(shipments, 'created'), inPrev30(shipments, 'created')),
        delivered: deliveredTrend,
        transit: transitTrend,
        revenue: revenueTrend,
        customers: customersTrend,
      },
    };
  }

  /* ------------------------------------------------------------------
   * Chart rendering (dependency-free SVG + progress bars)
   * ------------------------------------------------------------------ */
  function monthKey(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }
  function monthLabel(key) {
    var parts = key.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1)
      .toLocaleDateString('en-GB', { month: 'short' });
  }

  function monthlySeries(rows, getKey, getValue) {
    var map = {};
    var order = [];
    rows.forEach(function (r) {
      var k = getKey(r);
      if (!k) return;
      if (!(k in map)) { map[k] = 0; order.push(k); }
      map[k] += getValue(r);
    });
    order.sort();
    return {
      labels: order.map(monthLabel),
      keys: order,
      values: order.map(function (k) { return map[k]; }),
    };
  }

  function renderBarChart(containerId, labels, values, opts) {
    opts = opts || {};
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!values.length || values.every(function (v) { return !v; })) {
      el.innerHTML = '<div class="an-chart-empty"><i class="fas fa-chart-column"></i>No data for this filter range.</div>';
      return;
    }
    var max = Math.max.apply(null, values.map(Math.abs)) || 1;
    var W = opts.width || 560;
    var H = 200;
    var PAD_L = 34, PAD_R = 10, PAD_T = 16, PAD_B = 28;
    var plotW = W - PAD_L - PAD_R;
    var plotH = H - PAD_T - PAD_B;
    var n = values.length;
    var slot = plotW / n;
    var barW = Math.max(6, Math.min(46, slot * 0.62));
    var ticks = 4;

    var svg = '<svg class="an-svg-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (opts.aria || 'Bar chart') + '" preserveAspectRatio="xMidYMid meet">';
    // grid lines + y labels
    for (var g = 0; g <= ticks; g++) {
      var gy = Math.round(PAD_T + plotH - (g / ticks) * plotH);
      var gv = (max * g / ticks);
      svg += '<line x1="' + PAD_L + '" y1="' + gy + '" x2="' + (W - PAD_R) + '" y2="' + gy + '" class="grid-line"/>';
      svg += '<text x="' + (PAD_L - 8) + '" y="' + (gy + 3) + '" class="axis-label" text-anchor="end">' + (opts.money ? formatMoney(gv) : Math.round(gv).toLocaleString()) + '</text>';
    }
// bars — each rect carries a hover tooltip via a <title> element
    values.forEach(function (v, i) {
      var positive = v >= 0;
      var h = Math.max(0, Math.abs(v) / max * plotH);
      var x = Math.round(PAD_L + i * slot + (slot - barW) / 2);
      var tip = esc(labels[i]) + ': ' + (opts.money ? formatMoney(v) : fmtNum(v));
      if (positive) {
        var y = Math.round(PAD_T + plotH - h);
        svg += '<rect class="an-bar" x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="4" fill="' + (opts.color || '#2563eb') + '"><title>' + tip + '</title></rect>';
        svg += '<text x="' + (x + barW / 2) + '" y="' + Math.max(12, y - 6) + '" class="bar-val">' + fmtNum(v) + '</text>';
      } else {
        var y2 = Math.round(PAD_T + plotH);
        svg += '<rect class="an-bar" x="' + x + '" y="' + y2 + '" width="' + barW + '" height="' + h + '" rx="4" fill="#f59e0b"><title>' + tip + '</title></rect>';
        svg += '<text x="' + (x + barW / 2) + '" y="' + (y2 + h + 14) + '" class="bar-val">' + fmtNum(v) + '</text>';
      }
    });
    // x labels (skip if crowded)
    var step = Math.max(1, Math.ceil(n / 12));
    labels.forEach(function (l, i) {
      if (i % step !== 0 && n > 12) return;
      var x = Math.round(PAD_L + i * slot + slot / 2);
      svg += '<text x="' + x + '" y="' + (H - 8) + '" class="bar-label">' + esc(l) + '</text>';
    });
    svg += '</svg>';

    requestAnimationFrame(function () {
      el.innerHTML = svg;
    });
  }

  function renderDonut(containerId, rows, labels, valueKey, colorMap) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var total = rows.reduce(function (acc, r) { return acc + r.value; }, 0);
    if (!total) {
      el.innerHTML = '<div class="an-chart-empty"><i class="fas fa-chart-pie"></i>No data for this filter range.</div>';
      return;
    }
    var size = 190, cx = size / 2, cy = size / 2, r = 66, sw = 30;
    var circumference = 2 * Math.PI * r;
    var offset = 0;
    var svg = '<svg class="an-svg-chart" viewBox="0 0 ' + size + ' ' + size + '" style="max-width:220px;margin:0 auto;" role="img" aria-label="Donut chart">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--ag-surface-muted)" stroke-width="' + sw + '"/>';
    rows.forEach(function (row) {
      var frac = row.value / total;
      if (!frac) return;
      var dash = frac * circumference;
      var color = (colorMap && colorMap[row.label]) || '#2563eb';
      var rotate = offset * 360;
      var trans = 'rotate(' + rotate.toFixed(2) + ' ' + cx + ' ' + cy + ')';
      var style = 'stroke-dasharray:' + dash.toFixed(2) + ' ' + circumference.toFixed(2) + ';stroke-dashoffset:' + (-offset * circumference).toFixed(2) + ';';
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" style="' + style + '" transform="' + trans + '"/>';
      offset += frac;
    });
    svg += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" style="font-size:24px;font-weight:800;fill:var(--ag-text-900)">' + fmtNum(total) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" style="font-size:11px;fill:var(--ag-text-400)">' + (labels || 'Total') + '</text>';
    svg += '</svg>';
    el.innerHTML = svg;
  }

  function renderHLegend(containerId, rows, colorMap) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = rows.map(function (r) {
      var color = (colorMap && colorMap[r.label]) || '#2563eb';
      return '<span><span class="an-legend-dot" style="background:' + color + ';"></span>' + esc(r.label) + ' (' + r.value + ')</span>';
    }).join('');
  }

  function renderHBars(containerId, rows, colorMap, money) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    el.innerHTML = rows.map(function (r, i) {
      var pct = Math.round((r.value / max) * 100);
      var color = (colorMap && colorMap[r.label]) || SHADE[i % SHADE.length];
      return '<div class="an-hbar-row">' +
        '<span class="lbl" title="' + esc(r.label) + '">' + esc(r.label) + '</span>' +
        '<div class="track"><div class="fill" style="background:' + color + ';" data-w="' + pct + '"></div></div>' +
        '<span class="val">' + (money ? formatMoney(r.value) : fmtNum(r.value)) + '</span>' +
        '</div>';
    }).join('');
    requestAnimationFrame(function () {
      el.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
    });
  }

  var SHADE = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5', '#db2777', '#0d9488', '#9333ea'];

  /* ------------------------------------------------------------------
   * Aggregation builders
   * ------------------------------------------------------------------ */
  function aggregateStatuses(shipments) {
    var counts = {};
    shipments.forEach(function (s) { var st = normStatus(s.status); counts[st] = (counts[st] || 0) + 1; });
    return STATUS_ORDER.filter(function (st) { return counts[st]; }).map(function (st) { return { label: st, value: counts[st] }; });
  }

  function aggregateServices(shipments) {
    var counts = {};
    shipments.forEach(function (s) {
      var sv = s.serviceType || s.service_type || 'Other';
      counts[sv] = (counts[sv] || 0) + 1;
    });
    return Object.keys(counts).map(function (k) { return { label: k, value: counts[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function aggregateDestinations(shipments, limit) {
    var counts = {};
    shipments.forEach(function (s) { if (s.destination) counts[s.destination] = (counts[s.destination] || 0) + 1; });
    return Object.keys(counts).map(function (k) { return { label: k, value: counts[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  /* ------------------------------------------------------------------
   * Formatting
   * ------------------------------------------------------------------ */
  function fmtNum(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  }
  function formatMoney(v) {
    v = parseFloat(v) || 0;
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
    return '$' + v.toFixed(0);
  }
  function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------
   * Render KPI cards with animated counters + trend
   * ------------------------------------------------------------------ */
  function animateCount(el, target) {
    if (!el) return;
    var start = 0;
    var dur = 1200;
    var t0 = null;
    var money = el.dataset.money === '1';
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = start + (target - start) * eased;
      el.textContent = money ? formatMoney(val) : fmtNum(val);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = money ? formatMoney(target) : fmtNum(target);
    }
    requestAnimationFrame(frame);
  }

  function renderKpis(kpis) {
    var defs = [
      { id: 'kpiShipments', k: 'shipments', money: false },
      { id: 'kpiDelivered', k: 'delivered', money: false },
      { id: 'kpiTransit', k: 'transit', money: false },
      { id: 'kpiQuotes', k: 'quotes', money: false },
      { id: 'kpiRevenue', k: 'revenue', money: true },
      { id: 'kpiCustomers', k: 'customers', money: false },
      { id: 'kpiMessages', k: 'messages', money: false },
      { id: 'kpiGrowth', k: 'growth', money: false },
    ];
    defs.forEach(function (d) {
      var el = document.getElementById(d.id);
      if (!el) return;
      el.dataset.money = d.money ? '1' : '0';
      animateCount(el, kpis[d.k]);
    });

    // trend badges — real period-over-period percentages
    function setTrend(id, cls, txt, icon) {
      var el = document.getElementById(id);
      if (!el) return;
      el.className = 'an-kpi-trend ' + cls;
      el.innerHTML = '<i class="fas ' + icon + '"></i>' + txt;
    }
    function clsOf(v) { return v > 0 ? 'up' : v < 0 ? 'down' : 'neu'; }
    function iconOf(v) { return v >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'; }
    function trendLabel(v, suffix) {
      return (v === null || v === undefined) ? 'no prev data' : (v >= 0 ? '+' : '') + v + (suffix || '%');
    }

    var t = kpis.trends || {};
    var g = kpis.growth;
    setTrend('trendGrowth', clsOf(g), trendLabel(g), iconOf(g));
    setTrend('trendShipments', clsOf(t.shipments), trendLabel(t.shipments) + ' vs prev 30d', iconOf(t.shipments === null ? 0 : t.shipments));
    setTrend('trendDelivered', clsOf(t.delivered), trendLabel(t.delivered) + ' vs prev 30d', iconOf(t.delivered === null ? 0 : t.delivered));
    setTrend('trendTransit', clsOf(t.transit), trendLabel(t.transit) + ' vs prev 30d', iconOf(t.transit === null ? 0 : t.transit));
    setTrend('trendRevenue', clsOf(t.revenue), trendLabel(t.revenue) + ' vs prev 30d', iconOf(t.revenue === null ? 0 : t.revenue));
  }

  /* ------------------------------------------------------------------
   * Main render pipeline
   * ------------------------------------------------------------------ */
  function renderAll() {
    loadLocalData();
    var shipments = allShipments.filter(matchesFilters);
    var quotes = allQuotes.filter(function (q) { return inRange(q.created); });
    var kpis = computeKpis(shipments, quotes, allPayments, allInvoices);

    renderKpis(kpis);

    // Hero meta
    setText('metaShipments', fmtNum(kpis.shipments));
    setText('metaRevenue', formatMoney(kpis.revenue));
    setText('metaCustomers', fmtNum(kpis.customers));
    setText('metaQuotes', fmtNum(kpis.quotes));

    // Monthly shipments
    var shipSeries = monthlySeries(shipments, function (s) { return monthKey(s.created); }, function () { return 1; });
    renderBarChart('chartMonthlyShipments', shipSeries.labels, shipSeries.values, { color: '#2563eb', aria: 'Monthly shipments chart' });

    // Monthly revenue (from succeeded payments within range)
    var payRows = allPayments.filter(function (p) { return p.status === 'succeeded' && inRange(p.created_at); });
    var revSeries = monthlySeries(payRows, function (p) { return monthKey(p.created_at); }, function (p) { return parseFloat(p.amount) || 0; });
    renderBarChart('chartMonthlyRevenue', revSeries.labels, revSeries.values, { color: '#16a34a', money: true, aria: 'Monthly revenue chart' });

    // Status distribution (donut)
    var statusRows = aggregateStatuses(shipments);
    renderDonut('chartStatus', statusRows, 'Shipments', 'value', STATUS_COLORS);
    renderHLegend('legendStatus', statusRows, STATUS_COLORS);

    // Services distribution (donut + list)
    var serviceRows = aggregateServices(shipments);
    renderDonut('chartServices', serviceRows, 'Shipments', 'value', SERVICE_COLORS);
    renderHBars('listServices', serviceRows, SERVICE_COLORS, false);

    // Top destinations
    var destRows = aggregateDestinations(shipments, 10);
    var destColors = {};
    destRows.forEach(function (r, i) { destColors[r.label] = DEST_COLORS[i % DEST_COLORS.length]; });
    renderHBars('listDestinations', destRows, destColors, false);

    // Report summary table
    renderSummaryTable(shipments);

    animateBars();
  }

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function animateBars() {
    // Re-run the width transition after a tick so fills animate from 0
  }

  /* ------------------------------------------------------------------
   * Summary table (used by CSV export + on-screen report block)
   * ------------------------------------------------------------------ */
  function renderSummaryTable(shipments) {
    var el = document.getElementById('anSummaryBody');
    if (el) {
      var rows = aggregateStatuses(shipments);
      el.innerHTML = rows.length ? rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td style="text-align:right;">' + fmtNum(r.value) + '</td></tr>';
      }).join('') : '<tr><td colspan="2" style="text-align:center;color:var(--ag-text-400);padding:14px;">No data</td></tr>';
    }
    var tot = document.getElementById('anSummaryTotal');
    if (tot) tot.textContent = fmtNum(shipments.length);
    var rev = document.getElementById('anSummaryRevenue');
    if (rev) rev.textContent = formatMoney(computeKpis(shipments, [], allPayments, allInvoices).revenue);
  }

  /* ------------------------------------------------------------------
   * Exports
   * ------------------------------------------------------------------ */
  function buildReportRows() {
    var shipments = allShipments.filter(matchesFilters);
    var headers = ['Tracking', 'Customer', 'Email', 'Phone', 'Item', 'Origin', 'Destination', 'Service', 'Status', 'Value', 'Created', 'Staff'];
    var rows = shipments.map(function (s) {
      return [
        s.tracking || '', s.customer || s.customer_name || '', s.email || '', s.phone || '',
        s.item || s.item_description || '', s.origin || '', s.destination || '',
        s.serviceType || s.service_type || '', normStatus(s.status), s.value || '',
        s.created ? new Date(s.created).toLocaleDateString() : '', s.staff || ''
      ];
    });
    return { headers: headers, rows: rows, shipments: shipments };
  }

  function csvEscape(v) {
    var str = String(v ?? '');
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportCsv() {
    var data = buildReportRows();
    var lines = [data.headers.join(',')];
    data.rows.forEach(function (r) { lines.push(r.map(csvEscape).join(',')); });
    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var name = 'asan-analytics-' + filters.range + '-' + Date.now() + '.csv';
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    toast('CSV exported (' + data.rows.length + ' rows).', 'success');
  }

/**
   * Generate a real, openable .xls file using SpreadsheetML (XML).
   * No backend or third-party library is required — Excel / LibreOffice
   * open it natively. A future backend endpoint could replace this for
   * an authoritative .xlsx (see GET /api/analytics/reports?format=excel).
   */
  function exportExcel() {
    var data = buildReportRows();
    var rows = data.rows.map(function (r) {
      return '<Row>' + r.map(function (cell) {
        return '<Cell><Data ss:Type="String">' + xmlEscape(cell) + '</Data></Cell>';
      }).join('') + '</Row>';
    }).join('');
    var header = '<Row>' + data.headers.map(function (h) {
      return '<Cell><Data ss:Type="String">' + xmlEscape(h) + '</Data></Cell>';
    }).join('') + '</Row>';

    var xml =
      '<?xml version="1.0"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:html="http://www.w3.org/TR/REC-html40">' +
      '<Worksheet ss:Name="Shipments">' +
      '<Table>' + header + rows + '</Table>' +
      '</Worksheet></Workbook>';

    var blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var name = 'asan-analytics-' + filters.range + '-' + Date.now() + '.xls';
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    toast('Excel (.xls) exported (' + data.rows.length + ' rows).', 'success');
  }

  function xmlEscape(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  }

  /**
   * Open a print-friendly report window. The user can print or "Save as PDF"
   * from the browser's print dialog. (No server-side PDF engine is used.)
   */
  function exportPdf() {
    var data = buildReportRows();
    var kpis = computeKpis(data.shipments, allQuotes, allPayments, allInvoices);
    var rows = data.rows.map(function (r) {
      return '<tr>' + r.map(function (c) { return '<td>' + escapeHtml(c) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var header = data.headers.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('');

    var html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Asan Analytics Report</title>' +
      '<style>' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;margin:24px;}' +
      'h1{font-size:20px;margin:0 0 4px;} .sub{color:#64748b;font-size:12px;margin-bottom:20px;}' +
      '.kpis{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;}' +
      '.kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px;min-width:120px;}' +
      '.kpi b{display:block;font-size:18px;} .kpi span{font-size:11px;color:#64748b;}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;}' +
      'th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}' +
      'th{background:#f5f8fc;font-weight:600;}' +
      '@media print{body{margin:0;}}' +
      '</style></head><body>' +
      '<h1>Asan Global — Analytics Report</h1>' +
      '<div class="sub">Generated ' + new Date().toLocaleString() + ' · Range: ' + esc(filters.range) + ' · ' +
      (filters.service !== 'All' ? 'Service: ' + esc(filters.service) + ' · ' : '') +
      (filters.status !== 'All' ? 'Status: ' + esc(filters.status) + ' · ' : '') +
      data.rows.length + ' shipments</div>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + esc(fmtNum(kpis.shipments)) + '</b><span>Shipments</span></div>' +
      '<div class="kpi"><b>' + esc(fmtNum(kpis.delivered)) + '</b><span>Delivered</span></div>' +
      '<div class="kpi"><b>' + esc(fmtNum(kpis.transit)) + '</b><span>In Transit</span></div>' +
      '<div class="kpi"><b>' + esc(fmtNum(kpis.quotes)) + '</b><span>Quotes</span></div>' +
      '<div class="kpi"><b>' + esc(formatMoney(kpis.revenue)) + '</b><span>Revenue</span></div>' +
      '<div class="kpi"><b>' + esc(fmtNum(kpis.customers)) + '</b><span>Customers</span></div>' +
      '</div>' +
      '<table><thead><tr>' + header + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '</body></html>';

    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast('Popup blocked — allow popups to export PDF.', 'error'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 350);
    toast('PDF report opened — choose "Save as PDF" in the print dialog.', 'success');
  }

  function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  }

  function exportPrint() {
    window.print();
  }

  /* ------------------------------------------------------------------
   * Toast helper
   * ------------------------------------------------------------------ */
  function toast(msg, type) {
    var region = document.getElementById('anToastRegion');
    if (!region) return;
    var icons = { info: 'fa-info-circle', success: 'fa-check-circle', error: 'fa-exclamation-circle' };
    var colors = { info: 'var(--ag-blue-500)', success: '#16a34a', error: 'var(--ag-danger)' };
    var t = document.createElement('div');
    t.className = 'an-toast';
    t.style.borderLeftColor = colors[type] || colors.info;
    t.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '" style="color:' + (colors[type] || colors.info) + ';font-size:15px;"></i><span>' + esc(msg) + '</span>';
    region.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = '.3s'; setTimeout(function () { t.remove(); }, 320); }, 3500);
  }

  /* ------------------------------------------------------------------
   * Filters UI
   * ------------------------------------------------------------------ */
  function bindFilters() {
    var rangeSel = document.getElementById('fRange');
    var startInp = document.getElementById('fStart');
    var endInp = document.getElementById('fEnd');
    var serviceSel = document.getElementById('fService');
    var statusSel = document.getElementById('fStatus');
    var resetBtn = document.getElementById('fReset');

    // Populate service + status options from the store
    populateSelectOptions(serviceSel, 'serviceType', 'service');
    populateSelectOptions(statusSel, 'status', null, true);

    rangeSel.addEventListener('change', function () {
      filters.range = rangeSel.value;
      filters.start = null;
      filters.end = null;
      if (startInp) startInp.value = '';
      if (endInp) endInp.value = '';
      renderAll();
    });
    startInp.addEventListener('change', function () { filters.start = startInp.value || null; renderAll(); });
    endInp.addEventListener('change', function () { filters.end = endInp.value || null; renderAll(); });
    serviceSel.addEventListener('change', function () { filters.service = serviceSel.value; renderAll(); });
    statusSel.addEventListener('change', function () { filters.status = statusSel.value; renderAll(); });
    resetBtn.addEventListener('click', function () {
      filters = { range: '90d', start: null, end: null, service: 'All', status: 'All' };
      rangeSel.value = '90d';
      if (startInp) startInp.value = '';
      if (endInp) endInp.value = '';
      serviceSel.value = 'All';
      statusSel.value = 'All';
      renderAll();
    });
  }

  function populateSelectOptions(sel, primaryKey, secondaryKey, normalizeStatus) {
    if (!sel) return;
    var seen = {};
    allShipments.forEach(function (s) {
      var v = s[primaryKey] || (secondaryKey && s[secondaryKey]) || (normalizeStatus ? normStatus(s.status) : 'Other');
      if (normalizeStatus) v = normStatus(s.status);
      if (v && !seen[v]) { seen[v] = 1; sel.insertAdjacentHTML('beforeend', '<option value="' + esc(v) + '">' + esc(v) + '</option>'); }
    });
  }

  /* ------------------------------------------------------------------
   * Future backend API documentation (rendered only, never called)
   * ------------------------------------------------------------------ */
  function renderFutureApis() {
    var el = document.getElementById('futureApisBody');
    if (!el) return;
    el.innerHTML = FUTURE_BACKEND_APIS.map(function (api) {
      return '<tr><td><code>' + esc(api.method + ' ' + api.path) + '</code></td><td>' + esc(api.purpose) + '</td><td>' + esc(api.uses) + '</td></tr>';
    }).join('');
  }

  /* ------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------ */
  function init() {
    // Seed demo data only when stores are empty (never overwrites real data).
    seedDemoData();
    loadLocalData();
    bindFilters();
    renderFutureApis();
    checkBackend();
    renderAll();

    // Export buttons
    var csvBtn = document.getElementById('exportCsv');
    var xlsBtn = document.getElementById('exportExcel');
    var pdfBtn = document.getElementById('exportPdf');
    var printBtn = document.getElementById('exportPrint');
    if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    if (xlsBtn) xlsBtn.addEventListener('click', exportExcel);
    if (pdfBtn) pdfBtn.addEventListener('click', exportPdf);
    if (printBtn) printBtn.addEventListener('click', exportPrint);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a small API for testing / console access
  window.AsanAnalytics = {
    renderAll: renderAll,
    exportCsv: exportCsv,
    exportExcel: exportExcel,
    exportPdf: exportPdf,
    computeKpis: computeKpis,
    aggregateStatuses: aggregateStatuses,
    aggregateServices: aggregateServices,
    aggregateDestinations: aggregateDestinations,
    monthlySeries: monthlySeries,
    rangeBounds: rangeBounds,
    FUTURE_BACKEND_APIS: FUTURE_BACKEND_APIS,
  };
})();

