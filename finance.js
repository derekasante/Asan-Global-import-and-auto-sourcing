(() => {
  const walletBalanceEl = document.getElementById('walletBalance');
  const creditEl = document.getElementById('availableCredit');
  const pendingPaymentsEl = document.getElementById('pendingPayments');
  const outstandingEl = document.getElementById('outstandingAmount');
  const statusBadge = document.querySelector('.summary-badge');
  const transactionTable = document.querySelector('#transactionTable tbody');
  const paymentForm = document.getElementById('paymentForm');
  const depositBtn = document.getElementById('depositButton');
  const withdrawBtn = document.getElementById('withdrawButton');
  const methodSelect = document.getElementById('paymentMethod');

  let state = {
    balance: 12540,
    credit: 8200,
    pending: 24000,
    outstanding: 8600,
  };

  const formatUsd = (value) => `$${value.toLocaleString('en-US')}`;

  const updateDashboard = () => {
    walletBalanceEl.textContent = formatUsd(state.balance);
    creditEl.textContent = formatUsd(state.credit);
    pendingPaymentsEl.textContent = formatUsd(state.pending);
    outstandingEl.textContent = formatUsd(state.outstanding);
    statusBadge.textContent = `98% collection rate`; // kept static for the demo
  };

  const addTransaction = (description, amount, status) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${description}</td>
      <td>${methodSelect.value}</td>
      <td>${formatUsd(amount)}</td>
      <td><span class="status-pill ${status}">${status === 'status-paid' ? 'Paid' : status === 'status-pending' ? 'Pending' : 'Overdue'}</span></td>
    `;
    transactionTable.prepend(row);
  };

  if (paymentForm) {
    paymentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const amount = Number(event.target.amount.value);
      const type = event.target.transactionType.value;
      const description = event.target.description.value || 'Manual payment';

      if (!amount || amount <= 0) {
        return alert('Enter a valid amount to continue.');
      }

      if (type === 'deposit') {
        state.balance += amount;
        state.credit += Math.round(amount * 0.65);
        addTransaction(description, amount, 'status-paid');
      } else {
        if (amount > state.balance) {
          return alert('Insufficient wallet balance for withdrawal.');
        }
        state.balance -= amount;
        state.outstanding += Math.round(amount * 0.18);
        addTransaction(description, amount, 'status-paid');
      }

      updateDashboard();
      event.target.reset();
      methodSelect.value = 'Visa';
    });
  }

  if (depositBtn) {
    depositBtn.addEventListener('click', () => {
      const depositSection = document.getElementById('depositSection');
      depositSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      const withdrawSection = document.getElementById('withdrawSection');
      withdrawSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  updateDashboard();
})();