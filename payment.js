(() => {
  const form = document.getElementById('realPaymentForm');
  const balanceEl = document.querySelector('#paymentFormSection .payment-card p strong + span');
  const totalPaymentsEl = document.querySelector('.status-row .card:nth-child(1) p');
  const pendingEl = document.querySelector('.status-row .card:nth-child(2) p');
  const statusTableBody = document.querySelector('.table-responsive tbody');

  let state = {
    balance: 98420,
    totalPayments: 1280500,
    pending: 54800,
    transactions: [
      { vendor: 'Global Freight', category: 'Port Fees', amount: 4120, status: 'Paid' },
      { vendor: 'Ocean Cargo', category: 'Fuel', amount: 7840, status: 'Pending' },
      { vendor: 'Customs Plus', category: 'Clearance', amount: 2900, status: 'Paid' },
      { vendor: 'Marine Insurance', category: 'Insurance', amount: 1540, status: 'Overdue' },
    ],
  };

  const formatUsd = (value) => `$${value.toLocaleString('en-US')}`;

  const updateStats = () => {
    if (balanceEl) balanceEl.textContent = formatUsd(state.balance);
    if (totalPaymentsEl) totalPaymentsEl.textContent = formatUsd(state.totalPayments);
    if (pendingEl) pendingEl.textContent = formatUsd(state.pending);
  };

  const renderTransactions = () => {
    if (!statusTableBody) return;
    statusTableBody.innerHTML = '';
    state.transactions.forEach((tx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${tx.vendor}</td>
        <td>${tx.category}</td>
        <td>${formatUsd(tx.amount)}</td>
        <td><span class="status-pill ${tx.status === 'Paid' ? 'status-paid' : tx.status === 'Pending' ? 'status-pending' : 'status-overdue'}">${tx.status}</span></td>
      `;
      statusTableBody.appendChild(row);
    });
  };

  const validatePayment = (data) => {
    if (data.authCode.length < 4) {
      alert('PIN / MoMo Code must be at least 4 digits.');
      return false;
    }

    if (!/^[0-9]{6}$/.test(data.otp)) {
      alert('OTP must be a 6-digit code.');
      return false;
    }

    if (data.transactionType === 'withdraw' && data.amount > state.balance) {
      alert('Insufficient balance for this withdrawal.');
      return false;
    }

    return true;
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      payerName: event.target.payerName.value,
      paymentMethod: event.target.paymentMethod.value,
      amount: Number(event.target.amount.value),
      transactionType: event.target.transactionType.value,
      authCode: event.target.authCode.value,
      reference: event.target.reference.value,
      otp: event.target.otp.value,
      remarks: event.target.remarks.value,
    };

    if (!validatePayment(data)) return;

    if (data.transactionType === 'deposit') {
      state.balance += data.amount;
      state.totalPayments += data.amount;
      state.pending -= Math.round(data.amount * 0.15);
    } else {
      state.balance -= data.amount;
      state.pending += Math.round(data.amount * 0.25);
    }

    state.transactions.unshift({
      vendor: data.payerName,
      category: data.paymentMethod,
      amount: data.amount,
      status: 'Paid',
    });

    renderTransactions();
    updateStats();

    alert(`Payment ${data.transactionType === 'deposit' ? 'completed' : 'withdrawn'} successfully. Send payment to 0245357611 and keep your OTP secure.`);
    form.reset();
  });

  updateStats();
  renderTransactions();
})();