-- Asan Global Import & Auto Sourcing — initial schema
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE shipment_status AS ENUM (
  'pending',
  'confirmed',
  'picked_up',
  'in_transit',
  'customs_clearance',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'on_hold'
);

CREATE TYPE shipping_method AS ENUM (
  'air_freight',
  'ocean_freight',
  'express_courier',
  'ground',
  'rail'
);

CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- ---------------------------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  company       TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city          TEXT,
  state         TEXT,
  postal_code   TEXT,
  country       TEXT DEFAULT 'US',
  role          user_role NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles (email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, company)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Shipments
-- ---------------------------------------------------------------------------
CREATE TABLE public.shipments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number     TEXT NOT NULL UNIQUE,
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Package information
  package_description TEXT NOT NULL,
  package_weight_kg   NUMERIC(10, 2),
  package_length_cm   NUMERIC(10, 2),
  package_width_cm    NUMERIC(10, 2),
  package_height_cm   NUMERIC(10, 2),
  package_value_usd   NUMERIC(12, 2),
  package_quantity    INTEGER NOT NULL DEFAULT 1,

  -- Origin
  origin_address      TEXT NOT NULL,
  origin_city         TEXT NOT NULL,
  origin_state        TEXT,
  origin_postal_code  TEXT,
  origin_country      TEXT NOT NULL,

  -- Destination
  destination_address      TEXT NOT NULL,
  destination_city         TEXT NOT NULL,
  destination_state        TEXT,
  destination_postal_code  TEXT,
  destination_country      TEXT NOT NULL,

  -- Shipping details
  shipping_method     shipping_method NOT NULL DEFAULT 'ocean_freight',
  status              shipment_status NOT NULL DEFAULT 'pending',
  estimated_delivery  DATE,
  actual_delivery     DATE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_customer_id ON public.shipments (customer_id);
CREATE INDEX idx_shipments_tracking_number ON public.shipments (tracking_number);
CREATE INDEX idx_shipments_status ON public.shipments (status);

-- ---------------------------------------------------------------------------
-- Shipment status history
-- ---------------------------------------------------------------------------
CREATE TABLE public.shipment_status_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status       shipment_status NOT NULL,
  location     TEXT,
  description  TEXT,
  updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_updates_shipment_id ON public.shipment_status_updates (shipment_id);

-- ---------------------------------------------------------------------------
-- Tracking number generator (AGI-YYYYMMDD-XXXXXXXX)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  done       BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    new_number := 'AGI-' ||
      TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
    done := NOT EXISTS (
      SELECT 1 FROM public.shipments WHERE tracking_number = new_number
    );
  END LOOP;
  RETURN new_number;
END;
$$;

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_status_updates ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own profile; admins read all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Shipments: customers see own; admins see all
CREATE POLICY "Customers can view own shipments"
  ON public.shipments FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create own shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update shipments"
  ON public.shipments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Status updates: customers read own shipment history; admins manage all
CREATE POLICY "Customers can view own shipment status updates"
  ON public.shipment_status_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage status updates"
  ON public.shipment_status_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Public tracking view (no auth required) — exposed via backend service role only
CREATE OR REPLACE VIEW public.shipment_tracking_public AS
SELECT
  s.tracking_number,
  s.status,
  s.shipping_method,
  s.origin_city,
  s.origin_country,
  s.destination_city,
  s.destination_country,
  s.package_description,
  s.estimated_delivery,
  s.actual_delivery,
  s.created_at
FROM public.shipments s;
