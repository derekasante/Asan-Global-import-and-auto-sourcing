const { getSupabaseAdmin } = require('../config/supabase');
const { badRequest, notFound } = require('../utils/errors');

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

async function listCustomers({ search, limit = 20, offset = 0 } = {}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw badRequest(error.message, 'CUSTOMER_LIST_FAILED');
  }

  return {
    customers: (data || []).map(sanitizeProfile),
    total: count ?? 0,
    limit,
    offset,
  };
}

async function getCustomerById(customerId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', customerId)
    .eq('role', 'customer')
    .single();

  if (error || !data) {
    throw notFound('Customer not found');
  }

  const [shipments, orders, messages] = await Promise.all([
    supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
  ]);

  return {
    ...sanitizeProfile(data),
    stats: {
      shipments: shipments.count ?? 0,
      orders: orders.count ?? 0,
      messages: messages.count ?? 0,
    },
  };
}

async function updateCustomer(customerId, updates) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', customerId)
    .eq('role', 'customer')
    .select('*')
    .single();

  if (error || !data) {
    throw notFound('Customer not found or update failed');
  }

  return sanitizeProfile(data);
}

async function deleteCustomer(customerId) {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', customerId)
    .single();

  if (!profile || profile.role !== 'customer') {
    throw notFound('Customer not found');
  }

  const activeStatuses = [
    'pending',
    'confirmed',
    'picked_up',
    'in_transit',
    'customs_clearance',
    'out_for_delivery',
    'on_hold',
  ];

  const { count: activeShipments } = await supabase
    .from('shipments')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .in('status', activeStatuses);

  if (activeShipments > 0) {
    throw badRequest(
      'Cannot delete customer with active shipments. Cancel or complete them first.',
      'CUSTOMER_HAS_ACTIVE_SHIPMENTS'
    );
  }

  const { error } = await supabase.auth.admin.deleteUser(customerId);

  if (error) {
    throw badRequest(error.message, 'CUSTOMER_DELETE_FAILED');
  }

  return { message: 'Customer deleted successfully' };
}

module.exports = {
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
