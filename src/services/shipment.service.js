const { getSupabaseAdmin } = require('../config/supabase');
const { generateTrackingNumber } = require('../utils/trackingNumber');
const { notFound, badRequest, forbidden } = require('../utils/errors');

async function resolveTrackingNumber() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('generate_tracking_number');

  if (!error && data) {
    return data;
  }

  return generateTrackingNumber();
}

async function createShipment(customerId, payload) {
  const supabase = getSupabaseAdmin();
  const trackingNumber = await resolveTrackingNumber();

  const { data, error } = await supabase
    .from('shipments')
    .insert({
      tracking_number: trackingNumber,
      customer_id: customerId,
      ...payload,
    })
    .select('*')
    .single();

  if (error) {
    throw badRequest(error.message, 'SHIPMENT_CREATE_FAILED');
  }

  await supabase.from('shipment_status_updates').insert({
    shipment_id: data.id,
    status: 'pending',
    description: 'Shipment created and awaiting confirmation',
    updated_by: customerId,
  });

  return formatShipment(data);
}

async function listShipments(userId, role, { status, limit = 20, offset = 0 } = {}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('shipments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (role !== 'admin') {
    query = query.eq('customer_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw badRequest(error.message, 'SHIPMENT_LIST_FAILED');
  }

  return {
    shipments: (data || []).map(formatShipment),
    total: count ?? 0,
    limit,
    offset,
  };
}

async function getShipmentById(shipmentId, userId, role) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (error || !data) {
    throw notFound('Shipment not found');
  }

  if (role !== 'admin' && data.customer_id !== userId) {
    throw forbidden('You do not have access to this shipment');
  }

  const statusUpdates = await getStatusHistory(data.id);

  return {
    ...formatShipment(data),
    status_updates: statusUpdates,
  };
}

async function updateShipmentStatus(shipmentId, adminId, payload) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !existing) {
    throw notFound('Shipment not found');
  }

  const shipmentUpdates = {
    status: payload.status,
    updated_at: new Date().toISOString(),
  };

  if (payload.estimated_delivery) {
    shipmentUpdates.estimated_delivery = payload.estimated_delivery;
  }

  if (payload.actual_delivery) {
    shipmentUpdates.actual_delivery = payload.actual_delivery;
  } else if (payload.status === 'delivered') {
    shipmentUpdates.actual_delivery = new Date().toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('shipments')
    .update(shipmentUpdates)
    .eq('id', shipmentId)
    .select('*')
    .single();

  if (error) {
    throw badRequest(error.message, 'STATUS_UPDATE_FAILED');
  }

  const { data: statusRecord, error: historyError } = await supabase
    .from('shipment_status_updates')
    .insert({
      shipment_id: shipmentId,
      status: payload.status,
      location: payload.location,
      description: payload.description,
      updated_by: adminId,
    })
    .select('*')
    .single();

  if (historyError) {
    throw badRequest(historyError.message, 'STATUS_HISTORY_FAILED');
  }

  return {
    shipment: formatShipment(data),
    status_update: formatStatusUpdate(statusRecord),
  };
}

async function updateShipment(shipmentId, payload) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('shipments')
    .select('id')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !existing) {
    throw notFound('Shipment not found');
  }

  const { data, error } = await supabase
    .from('shipments')
    .update(payload)
    .eq('id', shipmentId)
    .select('*')
    .single();

  if (error) {
    throw badRequest(error.message, 'SHIPMENT_UPDATE_FAILED');
  }

  return formatShipment(data);
}

async function deleteShipment(shipmentId) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('shipments')
    .select('id')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !existing) {
    throw notFound('Shipment not found');
  }

  const { error } = await supabase.from('shipments').delete().eq('id', shipmentId);

  if (error) {
    throw badRequest(error.message, 'SHIPMENT_DELETE_FAILED');
  }

  return { message: 'Shipment deleted successfully' };
}

async function getStatusHistory(shipmentId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('shipment_status_updates')
    .select('*, profiles:updated_by(full_name)')
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map((row) => ({
    ...formatStatusUpdate(row),
    updated_by_name: row.profiles?.full_name ?? null,
  }));
}

async function trackByNumber(trackingNumber) {
  const supabase = getSupabaseAdmin();

  const { data: shipment, error } = await supabase
    .from('shipments')
    .select(
      `
      id,
      tracking_number,
      status,
      shipping_method,
      package_description,
      package_quantity,
      origin_city,
      origin_country,
      destination_city,
      destination_country,
      estimated_delivery,
      actual_delivery,
      created_at,
      updated_at
    `
    )
    .eq('tracking_number', trackingNumber.toUpperCase())
    .single();

  if (error || !shipment) {
    throw notFound('No shipment found with this tracking number');
  }

  const timeline = await getStatusHistory(shipment.id);

  return {
    tracking_number: shipment.tracking_number,
    status: shipment.status,
    shipping_method: shipment.shipping_method,
    package: {
      description: shipment.package_description,
      quantity: shipment.package_quantity,
    },
    origin: {
      city: shipment.origin_city,
      country: shipment.origin_country,
    },
    destination: {
      city: shipment.destination_city,
      country: shipment.destination_country,
    },
    estimated_delivery: shipment.estimated_delivery,
    actual_delivery: shipment.actual_delivery,
    created_at: shipment.created_at,
    last_updated: shipment.updated_at,
    timeline: timeline.map((u) => ({
      status: u.status,
      location: u.location,
      description: u.description,
      timestamp: u.created_at,
    })),
  };
}

function formatShipment(row) {
  return {
    id: row.id,
    tracking_number: row.tracking_number,
    customer_id: row.customer_id,
    package: {
      description: row.package_description,
      weight_kg: row.package_weight_kg,
      length_cm: row.package_length_cm,
      width_cm: row.package_width_cm,
      height_cm: row.package_height_cm,
      value_usd: row.package_value_usd,
      quantity: row.package_quantity,
    },
    origin: {
      address: row.origin_address,
      city: row.origin_city,
      state: row.origin_state,
      postal_code: row.origin_postal_code,
      country: row.origin_country,
    },
    destination: {
      address: row.destination_address,
      city: row.destination_city,
      state: row.destination_state,
      postal_code: row.destination_postal_code,
      country: row.destination_country,
    },
    shipping_method: row.shipping_method,
    status: row.status,
    estimated_delivery: row.estimated_delivery,
    actual_delivery: row.actual_delivery,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatStatusUpdate(row) {
  return {
    id: row.id,
    status: row.status,
    location: row.location,
    description: row.description,
    updated_by: row.updated_by,
    created_at: row.created_at,
  };
}

module.exports = {
  createShipment,
  listShipments,
  getShipmentById,
  updateShipment,
  updateShipmentStatus,
  deleteShipment,
  trackByNumber,
};
