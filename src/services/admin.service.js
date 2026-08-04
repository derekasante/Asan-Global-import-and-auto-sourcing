const { getSupabaseAdmin } = require('../config/supabase');

async function getDashboardStats() {
  const supabase = getSupabaseAdmin();

  const [
    customers,
    shipments,
    orders,
    messages,
    pendingShipments,
    newMessages,
    pendingOrders,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('shipments').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed', 'picked_up', 'in_transit', 'customs_clearance', 'out_for_delivery']),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const { data: recentShipments } = await supabase
    .from('shipments')
    .select('id, tracking_number, status, destination_city, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentMessages } = await supabase
    .from('messages')
    .select('id, name, subject, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totals: {
      customers: customers.count ?? 0,
      shipments: shipments.count ?? 0,
      orders: orders.count ?? 0,
      messages: messages.count ?? 0,
    },
    alerts: {
      active_shipments: pendingShipments.count ?? 0,
      new_messages: newMessages.count ?? 0,
      pending_orders: pendingOrders.count ?? 0,
    },
    recent: {
      shipments: recentShipments ?? [],
      messages: recentMessages ?? [],
    },
  };
}

module.exports = { getDashboardStats };
