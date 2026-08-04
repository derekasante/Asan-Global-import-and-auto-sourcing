const { getSupabaseAdmin } = require('../config/supabase');
const { badRequest, notFound } = require('../utils/errors');

async function resolveOrderNumber() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('generate_order_number');
  if (!error && data) return data;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  return `AGO-${date}-${random}`;
}

function formatOrder(row) {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id,
    title: row.title,
    description: row.description,
    items: row.items,
    total_value_usd: row.total_value_usd,
    status: row.status,
    shipment_id: row.shipment_id,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.profiles
      ? {
          id: row.profiles.id,
          full_name: row.profiles.full_name,
          email: row.profiles.email,
        }
      : undefined,
  };
}

async function createOrder(payload) {
  const supabase = getSupabaseAdmin();
  const orderNumber = await resolveOrderNumber();

  const { data, error } = await supabase
    .from('orders')
    .insert({ order_number: orderNumber, ...payload })
    .select('*, profiles:customer_id(id, full_name, email)')
    .single();

  if (error) {
    throw badRequest(error.message, 'ORDER_CREATE_FAILED');
  }

  return formatOrder(data);
}

async function listOrders({ status, customer_id, search, limit = 20, offset = 0 } = {}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('orders')
    .select('*, profiles:customer_id(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (customer_id) query = query.eq('customer_id', customer_id);
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,title.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw badRequest(error.message, 'ORDER_LIST_FAILED');
  }

  return {
    orders: (data || []).map(formatOrder),
    total: count ?? 0,
    limit,
    offset,
  };
}

async function getOrderById(orderId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:customer_id(id, full_name, email, phone, company)')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    throw notFound('Order not found');
  }

  return formatOrder(data);
}

async function updateOrder(orderId, updates) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select('*, profiles:customer_id(id, full_name, email)')
    .single();

  if (error || !data) {
    throw notFound('Order not found or update failed');
  }

  return formatOrder(data);
}

async function deleteOrder(orderId) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('orders').delete().eq('id', orderId);

  if (error) {
    throw badRequest(error.message, 'ORDER_DELETE_FAILED');
  }

  return { message: 'Order deleted successfully' };
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
