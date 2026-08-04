const { getSupabaseAdmin } = require('../config/supabase');
const { badRequest, notFound } = require('../utils/errors');

function formatMessage(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    body: row.body,
    status: row.status,
    admin_reply: row.admin_reply,
    replied_by: row.replied_by,
    replied_at: row.replied_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.profiles
      ? { id: row.profiles.id, full_name: row.profiles.full_name, email: row.profiles.email }
      : undefined,
    replied_by_profile: row.replied_by_profile
      ? { id: row.replied_by_profile.id, full_name: row.replied_by_profile.full_name }
      : undefined,
  };
}

async function submitMessage(payload, customerId = null) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('messages')
    .insert({ ...payload, customer_id: customerId })
    .select('*')
    .single();

  if (error) {
    throw badRequest(error.message, 'MESSAGE_SUBMIT_FAILED');
  }

  return formatMessage(data);
}

async function listMessages({ status, limit = 20, offset = 0 } = {}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('messages')
    .select('*, profiles:customer_id(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;

  if (error) {
    throw badRequest(error.message, 'MESSAGE_LIST_FAILED');
  }

  return {
    messages: (data || []).map(formatMessage),
    total: count ?? 0,
    limit,
    offset,
  };
}

async function getMessageById(messageId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('messages')
    .select(
      '*, profiles:customer_id(id, full_name, email), replied_by_profile:replied_by(id, full_name)'
    )
    .eq('id', messageId)
    .single();

  if (error || !data) {
    throw notFound('Message not found');
  }

  return formatMessage(data);
}

async function updateMessage(messageId, updates, adminId = null) {
  const supabase = getSupabaseAdmin();

  const patch = { ...updates };

  if (updates.admin_reply && adminId) {
    patch.replied_by = adminId;
    patch.replied_at = new Date().toISOString();
    patch.status = updates.status ?? 'replied';
  }

  const { data, error } = await supabase
    .from('messages')
    .update(patch)
    .eq('id', messageId)
    .select(
      '*, profiles:customer_id(id, full_name, email), replied_by_profile:replied_by(id, full_name)'
    )
    .single();

  if (error || !data) {
    throw notFound('Message not found or update failed');
  }

  return formatMessage(data);
}

async function deleteMessage(messageId) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('messages').delete().eq('id', messageId);

  if (error) {
    throw badRequest(error.message, 'MESSAGE_DELETE_FAILED');
  }

  return { message: 'Message deleted successfully' };
}

module.exports = {
  submitMessage,
  listMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
};
