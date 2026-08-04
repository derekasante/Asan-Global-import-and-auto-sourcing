const { getSupabaseAdmin } = require('../config/supabase');
const { unauthorized, forbidden } = require('../utils/errors');

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized('Missing or invalid authorization header');
    }

    const token = header.slice(7);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw unauthorized('Invalid or expired token');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw unauthorized('User profile not found');
    }

    req.user = data.user;
    req.profile = profile;
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, _res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return next(forbidden('Admin access required'));
  }
  next();
}

module.exports = { authenticate, requireAdmin };
