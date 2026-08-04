const { createAnonClient, getSupabaseAdmin } = require('../config/supabase');
const { badRequest, unauthorized, conflict } = require('../utils/errors');

async function register({ email, password, full_name, phone, company }) {
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, company },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw conflict('An account with this email already exists');
    }
    throw badRequest(error.message, 'REGISTRATION_FAILED');
  }

  if (!data.user) {
    throw badRequest('Registration failed', 'REGISTRATION_FAILED');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        }
      : null,
    message: data.session
      ? 'Registration successful'
      : 'Registration successful. Please check your email to confirm your account.',
  };
}

async function login({ email, password }) {
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name,
      role: profile?.role ?? 'customer',
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  };
}

async function refreshSession({ refresh_token }) {
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data.session) {
    throw unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  };
}

async function logout(accessToken) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.signOut(accessToken);

  if (error) {
    throw badRequest(error.message, 'LOGOUT_FAILED');
  }

  return { message: 'Logged out successfully' };
}

async function adminLogin({ email, password }) {
  const result = await login({ email, password });

  if (result.user.role !== 'admin') {
    throw unauthorized('Admin access required', 'ADMIN_ACCESS_REQUIRED');
  }

  return result;
}

module.exports = { register, login, adminLogin, refreshSession, logout };
