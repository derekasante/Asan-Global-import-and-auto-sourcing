const { getSupabaseAdmin } = require('../config/supabase');
const { notFound } = require('../utils/errors');

/**
 * Subscribe to live shipment updates via Supabase Realtime.
 * Returns an unsubscribe function.
 */
async function subscribeToTracking(trackingNumber, onEvent) {
  const supabase = getSupabaseAdmin();

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, tracking_number, status, updated_at')
    .eq('tracking_number', trackingNumber.toUpperCase())
    .single();

  if (!shipment) {
    throw notFound('No shipment found with this tracking number');
  }

  const channelName = `track:${shipment.tracking_number}:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shipments',
        filter: `id=eq.${shipment.id}`,
      },
      (payload) => {
        onEvent({
          type: 'shipment_update',
          data: {
            tracking_number: payload.new.tracking_number,
            status: payload.new.status,
            estimated_delivery: payload.new.estimated_delivery,
            actual_delivery: payload.new.actual_delivery,
            updated_at: payload.new.updated_at,
          },
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shipment_status_updates',
        filter: `shipment_id=eq.${shipment.id}`,
      },
      (payload) => {
        onEvent({
          type: 'status_update',
          data: {
            status: payload.new.status,
            location: payload.new.location,
            description: payload.new.description,
            created_at: payload.new.created_at,
          },
        });
      }
    )
    .subscribe();

  onEvent({
    type: 'connected',
    data: {
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      updated_at: shipment.updated_at,
    },
  });

  return async () => {
    await supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to live updates for a shipment by ID (authenticated users).
 */
async function subscribeToShipment(shipmentId, onEvent) {
  const supabase = getSupabaseAdmin();

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, tracking_number, status, customer_id, updated_at')
    .eq('id', shipmentId)
    .single();

  if (!shipment) {
    throw notFound('Shipment not found');
  }

  const channelName = `shipment:${shipmentId}:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shipments',
        filter: `id=eq.${shipmentId}`,
      },
      (payload) => {
        onEvent({ type: 'shipment_update', data: payload.new });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shipment_status_updates',
        filter: `shipment_id=eq.${shipmentId}`,
      },
      (payload) => {
        onEvent({ type: 'status_update', data: payload.new });
      }
    )
    .subscribe();

  onEvent({
    type: 'connected',
    data: {
      shipment_id: shipment.id,
      tracking_number: shipment.tracking_number,
      status: shipment.status,
    },
  });

  return async () => {
    await supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to admin dashboard live feeds (orders + messages).
 */
function subscribeToAdminFeed(onEvent) {
  const supabase = getSupabaseAdmin();
  const channelName = `admin:feed:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => onEvent({ type: 'order_created', data: payload.new })
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => onEvent({ type: 'order_updated', data: payload.new })
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => onEvent({ type: 'message_created', data: payload.new })
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'shipments' },
      (payload) => onEvent({ type: 'shipment_updated', data: payload.new })
    )
    .subscribe();

  onEvent({ type: 'connected', data: { channel: 'admin_feed' } });

  return async () => {
    await supabase.removeChannel(channel);
  };
}

function getRealtimeConfig(env, user) {
  return {
    supabase_url: env.SUPABASE_URL,
    supabase_anon_key: env.SUPABASE_ANON_KEY,
    channels: {
      shipment: 'postgres_changes on public.shipments',
      status_updates: 'postgres_changes on public.shipment_status_updates',
      orders: 'postgres_changes on public.orders',
      messages: 'postgres_changes on public.messages',
    },
    instructions:
      'Use @supabase/supabase-js with your access token for RLS-protected Realtime, or connect to SSE endpoints at /api/realtime/stream/*',
    user_id: user?.id ?? null,
    role: user?.role ?? null,
  };
}

module.exports = {
  subscribeToTracking,
  subscribeToShipment,
  subscribeToAdminFeed,
  getRealtimeConfig,
};
