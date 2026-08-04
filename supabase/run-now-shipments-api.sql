-- ════════════════════════════════════════════════════════════════════════════════
--  RUN THIS IN SUPABASE DASHBOARD → SQL EDITOR
--
--  Fixes POST /api/shipments:
--   1. Adds the missing columns the endpoint inserts into
--   2. Relaxes legacy NOT NULL constraints from the old detailed schema
--   3. Adds an INSERT RLS policy so the backend anon key can insert
--   4. Reloads the PostgREST schema cache (fixes
--      "Could not find the 'customer_name' column of 'shipments' in the schema cache")
--
--  Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ════════════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 1. Add all columns used by POST /api/shipments
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
-- 2. Relax legacy NOT NULL constraints so the simple API insert can succeed
--    (these belong to the old detailed schema; they are now optional).
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
-- 3. RLS policy so the backend endpoint (using the anon key) can INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create shipments via API" ON public.shipments;
CREATE POLICY "Anyone can create shipments via API"
  ON public.shipments FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. ⚠️ IMPORTANT: reload PostgREST schema cache so the new columns
--    are visible to the API right away (no server restart needed)
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 5. VERIFICATION
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'shipments'
ORDER BY ordinal_position;

