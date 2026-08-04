const { z } = require('zod');

const SHIPMENT_STATUSES = [
  'pending',
  'confirmed',
  'picked_up',
  'in_transit',
  'customs_clearance',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'on_hold',
];

const SHIPPING_METHODS = [
  'air_freight',
  'ocean_freight',
  'express_courier',
  'ground',
  'rail',
];

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  full_name: z.string().min(1, 'Full name is required').max(200),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const updateProfileSchema = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    phone: z.string().max(30).nullable().optional(),
    company: z.string().max(200).nullable().optional(),
    address_line1: z.string().max(300).nullable().optional(),
    address_line2: z.string().max(300).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    state: z.string().max(100).nullable().optional(),
    postal_code: z.string().max(20).nullable().optional(),
    country: z.string().max(100).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const createShipmentSchema = z.object({
  package_description: z.string().min(1).max(1000),
  package_weight_kg: z.number().positive().optional(),
  package_length_cm: z.number().positive().optional(),
  package_width_cm: z.number().positive().optional(),
  package_height_cm: z.number().positive().optional(),
  package_value_usd: z.number().nonnegative().optional(),
  package_quantity: z.number().int().positive().default(1),

  origin_address: z.string().min(1).max(500),
  origin_city: z.string().min(1).max(100),
  origin_state: z.string().max(100).optional(),
  origin_postal_code: z.string().max(20).optional(),
  origin_country: z.string().min(1).max(100),

  destination_address: z.string().min(1).max(500),
  destination_city: z.string().min(1).max(100),
  destination_state: z.string().max(100).optional(),
  destination_postal_code: z.string().max(20).optional(),
  destination_country: z.string().min(1).max(100),

  shipping_method: z.enum(SHIPPING_METHODS).default('ocean_freight'),
  estimated_delivery: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  notes: z.string().max(2000).optional(),

  /** Admin only: create shipment for another customer */
  customer_id: z.string().uuid().optional(),
});

const updateShipmentStatusSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  location: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  estimated_delivery: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  actual_delivery: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
});

const trackingParamSchema = z.object({
  trackingNumber: z
    .string()
    .min(5)
    .max(30)
    .regex(/^AGI-\d{8}-[A-F0-9]{8}$/i, 'Invalid tracking number format'),
});

const adminUpdateCustomerSchema = updateProfileSchema;

const updateShipmentSchema = z
  .object({
    customer_id: z.string().uuid().optional(),
    package_description: z.string().min(1).max(1000).optional(),
    package_weight_kg: z.number().positive().nullable().optional(),
    package_length_cm: z.number().positive().nullable().optional(),
    package_width_cm: z.number().positive().nullable().optional(),
    package_height_cm: z.number().positive().nullable().optional(),
    package_value_usd: z.number().nonnegative().nullable().optional(),
    package_quantity: z.number().int().positive().optional(),
    origin_address: z.string().min(1).max(500).optional(),
    origin_city: z.string().min(1).max(100).optional(),
    origin_state: z.string().max(100).nullable().optional(),
    origin_postal_code: z.string().max(20).nullable().optional(),
    origin_country: z.string().min(1).max(100).optional(),
    destination_address: z.string().min(1).max(500).optional(),
    destination_city: z.string().min(1).max(100).optional(),
    destination_state: z.string().max(100).nullable().optional(),
    destination_postal_code: z.string().max(20).nullable().optional(),
    destination_country: z.string().min(1).max(100).optional(),
    shipping_method: z.enum(SHIPPING_METHODS).optional(),
    status: z.enum(SHIPMENT_STATUSES).optional(),
    estimated_delivery: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    actual_delivery: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const orderItemSchema = z.object({
  name: z.string().min(1).max(300),
  quantity: z.number().int().positive().default(1),
  unit_price_usd: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

const createOrderSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).default([]),
  total_value_usd: z.number().nonnegative().optional(),
  status: z.enum(ORDER_STATUSES).default('pending'),
  shipment_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

const updateOrderSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).nullable().optional(),
    items: z.array(orderItemSchema).optional(),
    total_value_usd: z.number().nonnegative().nullable().optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    shipment_id: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const MESSAGE_STATUSES = ['new', 'read', 'replied', 'archived'];

const submitMessageSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(5000),
});

const updateMessageSchema = z
  .object({
    status: z.enum(MESSAGE_STATUSES).optional(),
    admin_reply: z.string().min(1).max(5000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  search: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
});

module.exports = {
  SHIPMENT_STATUSES,
  SHIPPING_METHODS,
  ORDER_STATUSES,
  MESSAGE_STATUSES,
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  adminUpdateCustomerSchema,
  createShipmentSchema,
  updateShipmentSchema,
  updateShipmentStatusSchema,
  trackingParamSchema,
  createOrderSchema,
  updateOrderSchema,
  submitMessageSchema,
  updateMessageSchema,
  paginationQuerySchema,
};
