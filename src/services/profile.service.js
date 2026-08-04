const { getSupabaseAdmin } = require('../config/supabase');
const { notFound } = require('../utils/errors');

async function getProfile(userId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw notFound('Profile not found');
  }

  return sanitizeProfile(data);
}

async function updateProfile(userId, updates) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw notFound('Profile not found or update failed');
  }

  return sanitizeProfile(data);
}

function sanitizeProfile(profile) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    company: profile.company,
    address_line1: profile.address_line1,
    address_line2: profile.address_line2,
    city: profile.city,
    state: profile.state,
    postal_code: profile.postal_code,
    country: profile.country,
    role: profile.role,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

module.exports = { getProfile, updateProfile };
