/* Asan Global document centre: client-side, print-ready A4 documents. */
(function () {
  'use strict';
  const esc = v => String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = v => window.AsanPayments?.money ? window.AsanPayments.money(v) : '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const date = v => window.AsanPayments?.fmtDate ? window.AsanPayments.fmtDate(v) : new Date(v || Date.now()).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  const value = (obj, keys, fallback = '—') => keys.map(key => obj?.[key]).find(v => v !== undefined && v !== null && v !== '') ?? fallback;
  const num = v => Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0;

  function shell(title, reference, body, footer) {
    return `<article class="ag-pdf-document">
      <header class="ag-pdf-header"><div class="ag-pdf-brand"><div class="ag-pdf-logo" aria-label="Asan Global logo placeholder">AG</div><div><strong>Asan Global</strong><span>Import &amp; Logistics Services</span></div></div><div class="ag-pdf-title"><h1>${esc(title)}</h1><span>${esc(reference)}</span></div></header>
      ${body}<footer class="ag-pdf-footer"><span>Asan Global · Tema, Ghana</span><span>${esc(footer || 'Generated ' + date(new Date()))}</span></footer>
    </article>`;
  }
  function status(status) { return `<span class="ag-pdf-status ${String(status).toLowerCase().replace(/\s+/g, '-')}">${esc(status || 'Pending')}</span>`; }
  function qrPlaceholder(label) { return `<div class="ag-pdf-qr" aria-label="QR code placeholder"><i class="fas fa-qrcode"></i><span>${esc(label)}</span></div>`; }
  function preview(title, html) {
    let modal = document.getElementById('agPdfPreview');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'agPdfPreview'; modal.className = 'ag-pdf-modal';
      modal.innerHTML = `<div class="ag-pdf-modal__backdrop" data-pdf-close></div><section class="ag-pdf-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="agPdfPreviewTitle"><header><div><p>Document preview</p><h2 id="agPdfPreviewTitle"></h2></div><div class="ag-pdf-modal__actions"><button class="ag-btn ag-btn-secondary" type="button" data-pdf-close>Close</button><button class="ag-btn ag-btn-primary" type="button" data-pdf-print><i class="fas fa-print"></i> Print / Save PDF</button></div></header><div class="ag-pdf-preview-scroll"><div class="ag-pdf-preview-page" id="agPdfPreviewContent"></div></div></section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target.closest('[data-pdf-close]')) modal.classList.remove('is-open'); if (e.target.closest('[data-pdf-print]')) print(); });
    }
    modal.querySelector('#agPdfPreviewTitle').textContent = title;
    modal.querySelector('#agPdfPreviewContent').innerHTML = html;
    modal.classList.add('is-open');
  }
  function print() {
    const source = document.getElementById('agPdfPreviewContent'); if (!source) return;
    let printRoot = document.getElementById('agPdfPrintRoot');
    if (!printRoot) { printRoot = document.createElement('div'); printRoot.id = 'agPdfPrintRoot'; document.body.appendChild(printRoot); }
    printRoot.innerHTML = source.innerHTML;
    window.print();
  }
  function invoice(inv, shipment) {
    const items = Array.isArray(inv.line_items) && inv.line_items.length ? inv.line_items : [{label: inv.description || 'Shipment services', amount: inv.total}];
    const origin = value(shipment, ['origin'], 'Origin pending'); const destination = value(shipment, ['destination'], 'Destination pending');
    return shell('Tax Invoice', inv.number || inv.id, `<section class="ag-pdf-content">
      <div class="ag-pdf-meta-grid"><div><label>Billed to</label><strong>${esc(inv.customer)}</strong><span>${esc(inv.email || 'Customer account')}</span></div><div><label>Invoice details</label><span><b>Issued:</b> ${date(inv.created_at)}</span><span><b>Due:</b> ${date(inv.due_at)}</span><span><b>Payment:</b> ${status(window.AsanPayments?.STATUS_LABEL?.[inv.status] || inv.status)}</span></div></div>
      <div class="ag-pdf-route"><div><label>Origin</label><strong>${esc(origin)}</strong></div><i class="fas fa-arrow-right"></i><div><label>Destination</label><strong>${esc(destination)}</strong></div><div><label>Service</label><strong>${esc(value(shipment, ['service','shippingMethod','method'], 'Vehicle import & logistics'))}</strong></div><div><label>Tracking number</label><strong>${esc(inv.tracking || value(shipment, ['tracking']))}</strong></div></div>
      <table class="ag-pdf-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.label)}</td><td>${money(i.amount)}</td></tr>`).join('')}</tbody></table>
      <div class="ag-pdf-total"><span>Total amount</span><strong>${money(inv.total)}</strong><small>Amount due: ${money(inv.amount_due)}</small></div>
      <div class="ag-pdf-lower"><div><label>Terms &amp; Conditions</label><p>Payment is due by the date shown. Shipping schedules and customs clearance are subject to carrier and regulatory requirements. Please quote the tracking number in all correspondence.</p></div>${qrPlaceholder('Invoice verification')}</div>
    </section>`, 'Invoice ' + (inv.number || inv.id));
  }
  function receipt(payment) {
    const receiptNo = 'ASG-RCT-' + String(payment.reference || payment.id || 'LOCAL').replace(/^PY-/, '');
    return shell('Payment Receipt', receiptNo, `<section class="ag-pdf-content"><div class="ag-pdf-receipt-mark"><i class="fas fa-circle-check"></i><div><strong>Payment received</strong>${status(payment.status === 'succeeded' ? 'Successful' : payment.status)}</div></div><div class="ag-pdf-meta-grid"><div><label>Received from</label><strong>${esc(payment.customer || 'Customer')}</strong><span>Invoice: ${esc(payment.invoice_number || '—')}</span></div><div><label>Transaction details</label><span><b>Payment reference:</b> ${esc(payment.reference || payment.id)}</span><span><b>Date:</b> ${date(payment.created_at)}</span><span><b>Method:</b> ${esc(payment.method_label || payment.method || '—')}</span></div></div><div class="ag-pdf-amount"><label>Amount paid</label><strong>${money(payment.amount)}</strong><span>Transaction status: ${esc(payment.status || '—')}</span></div><div class="ag-pdf-lower"><div><label>Payment note</label><p>This receipt confirms the payment recorded for the invoice above. Retain it for your records.</p></div>${qrPlaceholder('Receipt verification')}</div></section>`, 'Reference ' + (payment.reference || payment.id));
  }
  function shipment(shipment, events) {
    const tracking = value(shipment, ['tracking','tracking_number']); const list = Array.isArray(events) && events.length ? events : [{status: value(shipment, ['status'], 'Processing'), location: value(shipment, ['origin'], 'Asan Global Operations'), description: 'Current shipment update.', created_at: new Date().toISOString()}];
    return shell('Shipment Summary', tracking, `<section class="ag-pdf-content"><div class="ag-pdf-shipment-head"><div><label>Current status</label>${status(value(shipment, ['status'], 'Processing'))}</div><div><label>Service</label><strong>${esc(value(shipment, ['service','shippingMethod','method'], 'Ocean freight'))}</strong></div><div><label>Customer</label><strong>${esc(value(shipment, ['customer','customer_name'], 'Customer'))}</strong></div></div><div class="ag-pdf-route"><div><label>Origin</label><strong>${esc(value(shipment, ['origin']))}</strong></div><i class="fas fa-arrow-right"></i><div><label>Destination</label><strong>${esc(value(shipment, ['destination']))}</strong></div><div><label>Tracking number</label><strong>${esc(tracking)}</strong></div></div><h2 class="ag-pdf-section-title">Shipment timeline</h2><ol class="ag-pdf-timeline">${list.map(e => `<li><i class="fas fa-circle"></i><div><strong>${esc(e.status || 'Shipment update')}</strong><span>${esc(e.location || '—')} · ${date(e.created_at)}</span><p>${esc(e.description || 'Shipment update recorded.')}</p></div></li>`).join('')}</ol></section>`, 'Tracking ' + tracking);
  }
  function localShipment(tracking) { try { return JSON.parse(localStorage.getItem('asan_imports') || '[]').find(s => String(s.tracking || s.tracking_number).toUpperCase() === String(tracking).toUpperCase()); } catch (_) { return null; } }
  window.AsanDocuments = { previewInvoice(inv, shipment) { preview('Invoice preview', invoice(inv, shipment || localShipment(inv.tracking) || {})); }, previewReceipt(payment) { preview('Receipt preview', receipt(payment)); }, previewShipment(ship, events) { preview('Shipment summary preview', shipment(ship, events)); }, buildInvoice: invoice, buildReceipt: receipt, buildShipment: shipment, localShipment };
})();
