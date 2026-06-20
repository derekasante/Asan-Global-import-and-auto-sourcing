(() => {
  const form = document.querySelector('.login-box form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const rememberMeCheckbox = document.getElementById('rememberMe');

  const nameLink = document.getElementById('afterLoginLink');
  const nameText = document.getElementById('afterLoginName');

  // Initialize user database if not exists
  function initUserDatabase() {
    if (!localStorage.getItem('asan_users')) {
      const defaultUsers = [
        { email: 'admin@asan.com', password: 'admin123', name: 'Admin', role: 'admin' },
        { email: 'user@asan.com', password: 'user123', name: 'User', role: 'user' }
      ];
      localStorage.setItem('asan_users', JSON.stringify(defaultUsers));
    }
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

  // Restore saved email & password on page load
  const savedEmail = localStorage.getItem('asan_user_email');
  const savedPassword = localStorage.getItem('asan_user_password');
  const savedRemember = localStorage.getItem('asan_remember_me') === 'true';

  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
  }

  if (savedPassword && passwordInput && savedRemember) {
    passwordInput.value = savedPassword;
    if (rememberMeCheckbox) {
      rememberMeCheckbox.checked = true;
    }
  }

  // Restore name after reload
  const savedName = localStorage.getItem('asan_user_name');
  if (nameLink && nameText && savedName) {
    nameText.textContent = savedName;
  }

  // Validate login credentials
  function validateLogin(email, password) {
    const users = JSON.parse(localStorage.getItem('asan_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    return user;
  }

  // Handle login submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailValue = (emailInput?.value || '').trim();
    const passwordValue = (passwordInput?.value || '').trim();

    // Validate credentials
    const user = validateLogin(emailValue, passwordValue);

    if (!user) {
      alert('Invalid email or password. Please try again.');
      return;
    }

    // Save user session
    localStorage.setItem('asan_current_user', JSON.stringify(user));
    localStorage.setItem('asan_user_name', user.name);
    localStorage.setItem('asan_user_email', user.email);
    localStorage.setItem('asan_user_role', user.role);

    // Handle "Remember Me"
    if (rememberMeCheckbox?.checked) {
      localStorage.setItem('asan_user_password', passwordValue);
      localStorage.setItem('asan_remember_me', 'true');
    } else {
      localStorage.removeItem('asan_user_password');
      localStorage.setItem('asan_remember_me', 'false');
    }

    // Update text immediately
    if (nameLink && nameText) {
      nameText.textContent = user.name;
    }

    // Navigate based on role
    if (user.role === 'admin') {
      window.location.href = 'Admin.html';
    } else {
      window.location.href = form.getAttribute('action') || 'dashboard.html';
    }
  });

  // Social login handlers
  const socialButtons = document.querySelectorAll('.social-login a');
  socialButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = btn.classList.contains('google') ? 'Google' : 'Facebook';
      
      // Simulate OAuth flow
      const socialUser = {
        email: `user@${provider.toLowerCase()}.com`,
        password: 'social123',
        name: `${provider} User`,
        role: 'user'
      };

      // Add to users if not exists
      const users = JSON.parse(localStorage.getItem('asan_users') || '[]');
      if (!users.find(u => u.email === socialUser.email)) {
        users.push(socialUser);
        localStorage.setItem('asan_users', JSON.stringify(users));
      }

      // Auto-login
      localStorage.setItem('asan_current_user', JSON.stringify(socialUser));
      localStorage.setItem('asan_user_name', socialUser.name);
      localStorage.setItem('asan_user_email', socialUser.email);
      localStorage.setItem('asan_user_role', socialUser.role);

      alert(`Successfully signed in with ${provider}!`);
      window.location.href = 'dashboard.html';
    });
  });

  // Show/Hide registration form
  window.showRegistration = function() {
    document.querySelector('.login-box form').style.display = 'none';
    document.querySelector('.social-login').style.display = 'none';
    document.querySelector('.divider').style.display = 'none';
    document.querySelector('.signup').style.display = 'none';
    document.querySelector('.after-login-links').style.display = 'none';
    document.getElementById('registrationForm').style.display = 'block';
  };

  window.showLogin = function() {
    document.querySelector('.login-box form').style.display = 'block';
    document.querySelector('.social-login').style.display = 'flex';
    document.querySelector('.divider').style.display = 'block';
    document.querySelector('.signup').style.display = 'block';
    document.querySelector('.after-login-links').style.display = 'block';
    document.getElementById('registrationForm').style.display = 'none';
  };

  // Handle registration
  const regForm = document.getElementById('regForm');
  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('asan_users') || '[]');
    if (users.find(u => u.email === email)) {
      alert('An account with this email already exists. Please login instead.');
      showLogin();
      return;
    }

    // Create new user
    const newUser = {
      email: email,
      password: password,
      name: name,
      role: 'user'
    };

    users.push(newUser);
    localStorage.setItem('asan_users', JSON.stringify(users));

    // Auto-login after registration
    localStorage.setItem('asan_current_user', JSON.stringify(newUser));
    localStorage.setItem('asan_user_name', newUser.name);
    localStorage.setItem('asan_user_email', newUser.email);
    localStorage.setItem('asan_user_role', newUser.role);

    alert('Account created successfully! Welcome to Asan Global.');
    window.location.href = 'dashboard.html';
  });
})();

