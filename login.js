(() => {
  'use strict';

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const loginForm = document.getElementById('loginForm');

  const nameLink = document.getElementById('afterLoginLink');
  const nameText = document.getElementById('afterLoginName');

  // Show/Hide Password Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      const icon = togglePasswordBtn.querySelector('i');
      if (isPassword) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  }

  // Restore saved email on page load
  const savedEmail = localStorage.getItem('asan_user_email');
  const savedRemember = localStorage.getItem('asan_remember_me') === 'true';
  if (savedEmail && emailInput) emailInput.value = savedEmail;
  if (savedRemember && rememberMeCheckbox) rememberMeCheckbox.checked = true;

  // Restore name after reload
  const savedName = localStorage.getItem('asan_user_name');
  if (nameLink && nameText && savedName) {
    nameText.textContent = savedName;
  }

  function showToast(message, type) {
    const types = { error: ['#dc2626', 'fa-exclamation-circle'], success: ['#16a34a', 'fa-check-circle'], info: ['#2563eb', 'fa-info-circle'] };
    const [color, icon] = types[type] || types.info;
    let container = document.getElementById('asanToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'asanToastContainer';
      container.style.cssText = 'position:fixed;right:18px;bottom:86px;z-index:10003;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.style.cssText = `pointer-events:auto;background:rgba(255,255,255,.97);border:1px solid rgba(0,0,0,.08);border-left:4px solid ${color};box-shadow:0 14px 40px rgba(0,0,0,.14);border-radius:12px;padding:12px 16px;color:#0f172a;font-weight:600;font-size:13.5px;max-width:340px;display:flex;align-items:center;gap:10px;`;
    t.innerHTML = `<i class="fas ${icon}" style="color:${color};font-size:15px;"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, 4200);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#39;'
    }[c]));
  }

  // Redirect based on role
  function redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'customer-dashboard.html';
    }
  }

  // Handle login submit -> Supabase
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailValue = (emailInput?.value || '').trim();
    const passwordValue = (passwordInput?.value || '').trim();

    if (!emailValue || !passwordValue) {
      showToast('Please enter your email and password.', 'error');
      return;
    }

    const btn = loginForm.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';

    try {
      const result = await window.AsanAuth.login(emailValue, passwordValue);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      // Remember email
      if (rememberMeCheckbox?.checked) {
        localStorage.setItem('asan_remember_me', 'true');
        localStorage.setItem('asan_user_email', result.user.email);
      } else {
        localStorage.setItem('asan_remember_me', 'false');
        localStorage.setItem('asan_user_email', result.user.email);
      }

      const role = (result.profile && result.profile.role) || 'customer';
      const name = (result.profile && result.profile.full_name) || result.user.email;
      localStorage.setItem('asan_current_user', JSON.stringify({ email: result.user.email, name, role }));
      localStorage.setItem('asan_user_name', name);

      showToast('Signed in successfully! Redirecting…', 'success');
      setTimeout(() => redirectByRole(role), 600);
    } catch (err) {
      showToast(err.message || 'Unable to sign in.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  // ---- Registration form (in the Register tab) ----
  const regForm = document.getElementById('regForm');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value.trim();

    if (!name || !email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    const btn = regForm.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…';

    try {
      const result = await window.AsanAuth.signup(email, password, name);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Account created! Please check your email to confirm, then sign in.', 'success');
      // If no email confirmation needed (session present), go straight to dashboard.
      if (result.session) {
        const profile = await window.AsanAuth.fetchProfile();
        const role = (profile && profile.role) || 'customer';
        localStorage.setItem('asan_current_user', JSON.stringify({ email: result.user.email, name, role }));
        localStorage.setItem('asan_user_name', name);
        setTimeout(() => redirectByRole(role), 800);
      } else {
        // Show sign-in tab
        switchTab('signin');
      }
    } catch (err) {
      showToast(err.message || 'Unable to create account.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  // ---- Social login buttons (disabled - no OAuth provider configured) ----
  document.querySelectorAll('.social-login a').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Social login is not configured for this environment.', 'info');
    });
  });

  // The "Open dashboard as ..." shortcut link
  const afterLink = document.getElementById('afterLoginLink');
  if (afterLink) {
    afterLink.addEventListener('click', (e) => {
      e.preventDefault();
      const user = JSON.parse(localStorage.getItem('asan_current_user') || 'null');
      if (user) {
        redirectByRole(user.role);
      } else {
        window.location.href = 'login.html';
      }
    });
  }
})();
