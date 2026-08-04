-- ════════════════════════════════════════════════════════════════════════════════
--  Migration 005: Complete fix for the shipments table + RLS policies
--  Run this in Supabase Dashboard → SQL Editor after migrations 001–004.
--
--  Fixes:
--   1. Adds all simple-API columns to `shipments` (customer_name, customer_email,
--      customer_phone, item_description, origin, destination, service_type).
--   2. Relaxes legacy NOT NULL constraints that block simple inserts.
--   3. Drops the recursive "Admins can view all profiles" policy (root cause of
--      "infinite recursion detected in policy for relation 'profiles'").
--   4. Adds a safe anonymous INSERT policy for the public /api/shipments endpoint.
--   5. Reloads the PostgREST schema cache so the API sees the new columns.
--
--  Safe to run multiple times (IF NOT EXISTS / IF EXISTS everywhere).
-- ════════════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 1. Add simple-API columns to shipments
-- ---------------------------------------------------------------------------
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS customer_email   TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS item_description TEXT,
  ADD COLUMN IF NOT EXISTS origin           TEXT,
  ADD COLUMN IF NOT EXISTS destination      TEXT,
  ADD COLUMN IF NOT EXISTS service_type     TEXT;

-- ---------------------------------------------------------------------------
-- 2. Relax legacy NOT NULL constraints (these belong to the detailed schema;
--    they are now optional so the simple API insert can succeed).
-- ---------------------------------------------------------------------------
ALTER TABLE public.shipments
  ALTER COLUMN customer_id         DROP NOT NULL,
  ALTER COLUMN package_description DROP NOT NULL,
  ALTER COLUMN origin_address      DROP NOT NULL,
  ALTER COLUMN origin_city         DROP NOT NULL,
  ALTER COLUMN origin_country      DROP NOT NULL,
  ALTER COLUMN destination_address DROP NOT NULL,
  ALTER COLUMN destination_city    DROP NOT NULL,
  ALTER COLUMN destination_country DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. FIX THE INFINITE RECURSION BUG
--    The old policy "Admins can view all profiles" references public.profiles
--    inside a subquery on public.profiles with the admin role check. When the
--    admin client (service role bypasses RLS, but the anon/authenticated client)
--    tries to read profiles, the RLS check re-enters the same table and loops.
--
--    We drop the old policy and recreate it WITHOUT the recursive subquery —
--    using a security-definer helper function that does not trigger RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- A non-recursive admin check: a SECURITY DEFINER function bypasses RLS,
-- so querying profiles inside it does not re-trigger the profiles policies.
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

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Also update the other admin policies that use the recursive pattern so they
-- all rely on the non-recursive helper.
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;
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

DROP POLICY IF EXISTS "Admins can manage status updates" ON public.shipment_status_updates;
CREATE POLICY "Admins can manage status updates"
  ON public.shipment_status_updates FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Public anonymous INSERT policy for the simple /api/shipments endpoint
--    (used by the homepage / import form which is not logged in).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create shipments via API" ON public.shipments;
CREATE POLICY "Anyone can create shipments via API"
  ON public.shipments FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Reload the PostgREST schema cache so new columns are visible immediately
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 6. VERIFICATION
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'shipments'
ORDER BY ordinal_position;

