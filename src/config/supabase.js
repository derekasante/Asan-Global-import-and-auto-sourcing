const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;
let env = null;

function initSupabase(config) {
  env = config;

  const supabaseKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
  supabaseAdmin = createClient(config.SUPABASE_URL, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  return supabaseAdmin;
}

/** User-scoped client that forwards the caller's JWT to Supabase (respects RLS). */
function createUserClient(accessToken) {
  if (!env) {
    throw new Error('Supabase not initialized');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Anonymous client for auth sign-up / sign-in (no session persisted). */
function createAnonClient() {
  if (!env) {
    throw new Error('Supabase not initialized');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

module.exports = {
  initSupabase,
  getSupabaseAdmin,
  createUserClient,
  createAnonClient,
};
