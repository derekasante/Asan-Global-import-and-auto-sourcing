-- Migration 002: Admin dashboard (orders, messages) + Supabase Realtime
-- Run after 001_initial_schema.sql in Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE message_status AS ENUM (
  'new',
  'read',
  'replied',
  'archived'
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE,
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title           TEXT NOT NULL,
  description     TEXT,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value_usd NUMERIC(12, 2),
  status          order_status NOT NULL DEFAULT 'pending',
  shipment_id     UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_order_number ON public.orders (order_number);

-- Order number generator (AGO-YYYYMMDD-XXXXXXXX)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  done       BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    new_number := 'AGO-' ||
      TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
    done := NOT EXISTS (
      SELECT 1 FROM public.orders WHERE order_number = new_number
    );
  END LOOP;
  RETURN new_number;
END;
$$;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Messages (contact / inquiry)
-- ---------------------------------------------------------------------------
CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  status       message_status NOT NULL DEFAULT 'new',
  admin_reply  TEXT,
  replied_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_status ON public.messages (status);
CREATE INDEX idx_messages_customer_id ON public.messages (customer_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at DESC);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Additional admin RLS policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete shipments"
  ON public.shipments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Orders RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Messages RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Enable Supabase Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_status_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Realtime RLS: authenticated users receive row changes they can SELECT
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER TABLE public.shipment_status_updates REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
