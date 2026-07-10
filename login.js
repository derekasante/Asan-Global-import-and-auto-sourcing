(() => {
  const form = document.querySelector('.login-box form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const rememberMeCheckbox = document.getElementById('rememberMe');

  const nameLink = document.getElementById('afterLoginLink');
  const nameText = document.getElementById('afterLoginName');

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  async function hashPassword(password) {
    return securityUtils?.hashText(password) || password;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem('asan_users') || '[]');
  }

  function setUsers(users) {
    localStorage.setItem('asan_users', JSON.stringify(users));
  }

  async function initUserDatabase() {
    const existingUsers = getUsers();
    if (existingUsers.length) {
      return;
    }

    const defaultUsers = [
      { email: 'admin@asan.com', password: await hashPassword('admin123'), name: 'Admin', role: 'admin' },
      { email: 'user@asan.com', password: await hashPassword('user123'), name: 'User', role: 'user' }
    ];
    setUsers(defaultUsers);
  }

  initUserDatabase();

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

  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
  }

  if (savedRemember && rememberMeCheckbox) {
    rememberMeCheckbox.checked = true;
  }

  // Restore name after reload
  const savedName = localStorage.getItem('asan_user_name');
  if (nameLink && nameText && savedName) {
    nameText.textContent = savedName;
  }

  async function validateLogin(email, password) {
    const users = getUsers();
    const normalizedEmail = normalizeEmail(email);
    const user = users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
    if (!user) {
      return null;
    }

    const inputHash = await hashPassword(password);
    const storedHash = typeof user.password === 'string' && /^[a-f0-9]{64}$/i.test(user.password)
      ? user.password
      : await hashPassword(user.password || '');

    return inputHash === storedHash ? user : null;
  }

  function persistSession(user) {
    const safeUser = { email: user.email, name: user.name, role: user.role };
    localStorage.setItem('asan_current_user', JSON.stringify(safeUser));
    localStorage.setItem('asan_user_name', user.name);
    localStorage.setItem('asan_user_email', user.email);
    localStorage.setItem('asan_user_role', user.role);
  }

  function showRegistration() {
    document.querySelector('.login-box form').style.display = 'none';
    document.querySelector('.social-login').style.display = 'none';
    document.querySelector('.divider').style.display = 'none';
    document.querySelector('.signup').style.display = 'none';
    document.querySelector('.after-login-links').style.display = 'none';
    document.getElementById('registrationForm').style.display = 'block';
  }

  function showLogin() {
    document.querySelector('.login-box form').style.display = 'block';
    document.querySelector('.social-login').style.display = 'flex';
    document.querySelector('.divider').style.display = 'block';
    document.querySelector('.signup').style.display = 'block';
    document.querySelector('.after-login-links').style.display = 'block';
    document.getElementById('registrationForm').style.display = 'none';
  }

  document.getElementById('showRegistrationLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showRegistration();
  });

  document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
  });

  // Handle login submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailValue = (emailInput?.value || '').trim();
    const passwordValue = (passwordInput?.value || '').trim();

    const user = await validateLogin(emailValue, passwordValue);

    if (!user) {
      alert('Invalid email or password. Please try again.');
      return;
    }

    persistSession(user);

    if (rememberMeCheckbox?.checked) {
      localStorage.setItem('asan_remember_me', 'true');
      localStorage.setItem('asan_user_email', user.email);
    } else {
      localStorage.setItem('asan_remember_me', 'false');
      localStorage.setItem('asan_user_email', user.email);
    }

    if (nameLink && nameText) {
      nameText.textContent = user.name;
    }

    if (user.role === 'admin') {
      window.location.href = 'Admin.html';
    } else {
      window.location.href = form.getAttribute('action') || 'dashboard.html';
    }
  });

  const socialNamePrompt = document.getElementById('socialNamePrompt');
  const socialNameInput = document.getElementById('socialName');
  const socialNameContinue = document.getElementById('socialNameContinue');
  let pendingProvider = '';

  function finishSocialLogin(provider, name) {
    const socialUser = {
      email: `user@${provider.toLowerCase()}.com`,
      password: 'social123',
      name,
      role: 'user'
    };

    const users = getUsers();
    if (!users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(socialUser.email))) {
      users.push(socialUser);
      setUsers(users);
    }

    persistSession(socialUser);
    localStorage.setItem('asan_remember_me', 'false');

    alert(`Successfully signed in with ${provider}!`);
    window.location.href = 'dashboard.html';
  }

  const socialButtons = document.querySelectorAll('.social-login a');
  socialButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      pendingProvider = btn.classList.contains('google') ? 'Google' : 'Facebook';
      socialNamePrompt.style.display = 'block';
      socialNameInput.focus();
    });
  });

  socialNameContinue?.addEventListener('click', () => {
    const name = socialNameInput.value.trim();
    if (!name) {
      alert('Name is required. Please try again.');
      return;
    }

    finishSocialLogin(pendingProvider || 'Google', name);
  });

  const regForm = document.getElementById('regForm');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = normalizeEmail(document.getElementById('regEmail').value);
    const password = document.getElementById('regPassword').value.trim();

    const users = getUsers();
    if (users.find((entry) => normalizeEmail(entry.email) === email)) {
      alert('An account with this email already exists. Please login instead.');
      showLogin();
      return;
    }

    const newUser = {
      email,
      password: await hashPassword(password),
      name,
      role: 'user'
    };

    users.push(newUser);
    setUsers(users);
    persistSession(newUser);
    localStorage.setItem('asan_remember_me', 'false');

    alert('Account created successfully! Welcome to Asan Global.');
    window.location.href = 'dashboard.html';
  });
})();

