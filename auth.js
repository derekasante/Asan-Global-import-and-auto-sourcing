/**
 * Asan Global — Frontend Auth helper (Supabase)
 * ---------------------------------------------------------------
 * Central wrapper around the Supabase JS client for authentication.
 * Used by login.html, signup.html, admin-dashboard.html and
 * customer-dashboard.html.
 *
 * Security:
 *   - Only uses the public anon key (safe for client-side).
 *   - The service-role key is never exposed to the browser.
 *   - Session is stored in localStorage by Supabase.
 */
(function () {
  'use strict';

  var cfg = window.ASAN_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error('[auth.js] Supabase config missing. Load supabase-config.js first.');
    return;
  }

  // Lazy-create the Supabase client (loaded from CDN in the page).
  function client() {
    if (window._asanSupabase) return window._asanSupabase;
    // The Supabase v2 UMD build exposes window.supabase.createClient.
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('[auth.js] Supabase JS library not loaded.');
    }
    window._asanSupabase = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return window._asanSupabase;
  }

  /**
   * Fetch the profile record for the current logged-in user.
   * Uses RLS — a user can only read their own profile (or an admin all).
   */
  async function fetchProfile() {
    const sb = client();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[auth.js] fetchProfile error:', error.message);
      return null;
    }
    return data;
  }

  /**
   * Get the current authenticated user (Supabase auth.users).
   */
  async function getUser() {
    const sb = client();
    const { data: { user }, error } = await sb.auth.getUser();
    if (error) return null;
    return user;
  }

  /**
   * Get the current session.
   */
  async function getSession() {
    const sb = client();
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data.session;
  }

  /**
   * Sign in with email + password.
   * Returns { error: null, user, profile } or { error: message }.
   */
  async function login(email, password) {
    try {
      const sb = client();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message || 'Invalid email or password' };
      }
      const profile = await fetchProfile();
      return { error: null, user: data.user, session: data.session, profile };
    } catch (e) {
      return { error: e.message || 'Unable to sign in' };
    }
  }

  /**
   * Sign up a new customer.
   * The DB trigger `on_auth_user_created` auto-creates a profile row
   * with role 'customer'. We pass full_name in user_metadata.
   */
  async function signup(email, password, fullName) {
    try {
      const sb = client();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // A relative URL preserves a GitHub Pages project base path, e.g.
          // https://account.github.io/project/login.html (not /login.html).
          emailRedirectTo: new URL('login.html', window.location.href).href,
        },
      });
      if (error) {
        return { error: error.message || 'Unable to create account' };
      }
      return {
        error: null,
        user: data.user,
        session: data.session,
        needsEmailConfirmation: !data.session,
      };
    } catch (e) {
      return { error: e.message || 'Unable to create account' };
    }
  }

  /**
   * Sign out.
   */
  async function logout() {
    try {
      const sb = client();
      await sb.auth.signOut();
    } catch (e) {
      console.error('[auth.js] logout error:', e);
    }
    // Also clear any legacy app session.
    try { localStorage.removeItem('asan_current_user'); } catch (e) {}
  }

  /**
   * Guard: require an authenticated user. Optionally require a role.
   *   requireAuth()            -> redirects to login.html if not logged in
   *   requireAuth('admin')     -> redirects to login.html unless profile.role === 'admin'
   *   requireAuth('customer')  -> redirects to login.html unless profile.role === 'customer'
   *
   * Returns the resolved { user, profile } or null (redirect handled).
   */
  async function requireAuth(role) {
    const user = await getUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    const profile = await fetchProfile();
    if (role) {
      const actual = (profile && profile.role) || 'customer';
      if (actual !== role) {
        // Authenticated but wrong role -> redirect to the right dashboard.
        window.location.href = actual === 'admin' ? 'admin-dashboard.html' : 'customer-dashboard.html';
        return null;
      }
    }
    return { user, profile };
  }

  /**
   * Expose a small public API.
   */
  window.AsanAuth = {
    client: client,
    login: login,
    signup: signup,
    logout: logout,
    getUser: getUser,
    getSession: getSession,
    fetchProfile: fetchProfile,
    requireAuth: requireAuth,
  };
})();
