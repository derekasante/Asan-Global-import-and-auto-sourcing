-- ════════════════════════════════════════════════════════════════════════════════
--  Migration 006: FULL DATABASE FIX  (idempotent — safe to run multiple times)
--  Run THIS ONE FILE in Supabase Dashboard → SQL Editor  (runs after 001–005)
--
--  Fixes all issues discovered by endpoint testing on 2026-08-02:
--
--   FAIL #1  POST /api/quotes
--     → "Could not find the 'destination' column of 'quotes' in the schema cache"
--       The quotes table exists but is MISSING its columns (only id + created_at).
--   FAIL #2  POST /api/shipments
--     → "infinite recursion detected in policy for relation 'profiles'"
--       The old admin policy on profiles recurses into itself.
--   FAIL #3  GET /api/shipments/:tracking  +  SELECT shipments/messages
--     → same recursive profiles-policy error.
--
--  This file:
--    1. Repairs the quotes table (adds all missing columns).
--    2. Adds the simple-API columns to shipments + relaxes legacy NOT NULLs.
--    3. FIXES the recursive profiles RLS policy using a SECURITY DEFINER helper.
--    4. Adds safe anonymous INSERT policies for quotes / shipments / messages.
--    5. Reloads the PostgREST schema cache.
--    6. Prints verification results.
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. CREATE THE is_admin() HELPER FIRST
--    Must be defined BEFORE any policy references it.
--    SECURITY DEFINER bypasses RLS, preventing infinite recursion.
-- ════════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. REPAIR quotes TABLE
--    (existing table only has id + created_at → add every missing column)
-- ════════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS name            TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS service         TEXT,
  ADD COLUMN IF NOT EXISTS origin          TEXT,
  ADD COLUMN IF NOT EXISTS destination     TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_details TEXT;

-- (Columns are added nullable so existing rows are never blocked.)

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON public.quotes (email);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can view quotes"        ON public.quotes;
DROP POLICY IF EXISTS "Anyone can submit a quote"   ON public.quotes;
DROP POLICY IF EXISTS "Only admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Only admins can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes"  ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes"    ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes"    ON public.quotes;

CREATE POLICY "Anon can view quotes"
  ON public.quotes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit a quote"
  ON public.quotes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update quotes"
  ON public.quotes FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete quotes"
  ON public.quotes FOR DELETE
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. FIX THE INFINITE RECURSION in the profiles RLS policy
--    Root cause: the old admin policy ran a SELECT on public.profiles inside a
--    policy ON public.profiles → re-enters RLS → infinite loop.
--    Fix: the SECURITY DEFINER is_admin() above bypasses RLS.
-- ════════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. SHIPMENTS: add simple-API columns + relax legacy NOT NULL constraints
-- ════════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS customer_email   TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS item_description TEXT,
  ADD COLUMN IF NOT EXISTS origin           TEXT,
  ADD COLUMN IF NOT EXISTS destination      TEXT,
  ADD COLUMN IF NOT EXISTS service_type     TEXT;

ALTER TABLE public.shipments
  ALTER COLUMN customer_id         DROP NOT NULL,
  ALTER COLUMN package_description DROP NOT NULL,
  ALTER COLUMN origin_address      DROP NOT NULL,
  ALTER COLUMN origin_city         DROP NOT NULL,
  ALTER COLUMN origin_country      DROP NOT NULL,
  ALTER COLUMN destination_address DROP NOT NULL,
  ALTER COLUMN destination_city    DROP NOT NULL,
  ALTER COLUMN destination_country DROP NOT NULL;

-- Shipments RLS: anonymous INSERT policy (used by the import form / API)
DROP POLICY IF EXISTS "Anyone can create shipments via API" ON public.shipments;
CREATE POLICY "Anyone can create shipments via API"
  ON public.shipments FOR INSERT
  WITH CHECK (true);

-- Shipments: rewrite admin policies to use the non-recursive helper
DROP POLICY IF EXISTS "Admins can view all shipments"  ON public.shipments;
CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
CREATE POLICY "Admins can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
CREATE POLICY "Admins can update shipments"
  ON public.shipments FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
CREATE POLICY "Admins can delete shipments"
  ON public.shipments FOR DELETE
  USING (public.is_admin());

-- Status updates: rewrite admin policy too
DROP POLICY IF EXISTS "Admins can manage status updates" ON public.shipment_status_updates;
CREATE POLICY "Admins can manage status updates"
  ON public.shipment_status_updates FOR ALL
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. ORDERS + MESSAGES: rewrite admin policies to use the non-recursive helper
-- ════════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  USING (public.is_admin());

-- Ensure messages has the anon INSERT policy (contact form)
DROP POLICY IF EXISTS "Anyone can submit messages" ON public.messages;
CREATE POLICY "Anyone can submit messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. RELOAD PostgREST schema cache (so the API sees new columns immediately)
-- ════════════════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. VERIFICATION — run these to confirm everything is fixed
-- ════════════════════════════════════════════════════════════════════════════════
SELECT '✅ quotes columns:' AS check, string_agg(column_name, ', ') AS columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quotes';

SELECT '✅ shipments columns:' AS check, string_agg(column_name, ', ') AS columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shipments';

SELECT '✅ messages columns:' AS check, string_agg(column_name, ', ') AS columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages';

SELECT '✅ RLS policies on profiles:' AS check, string_agg(policyname, ', ') AS policies
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

