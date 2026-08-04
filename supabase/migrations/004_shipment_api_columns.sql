-- Migration 004: Add columns used by the POST /api/shipments endpoint
-- Run this in Supabase Dashboard → SQL Editor after migrations 001–003
--
-- The POST /api/shipments route in backend/server.js inserts these fields:
--   tracking_number, customer_name, phone, item_description,
--   origin, destination, status, created_at
--
-- The existing shipments table (from 001_initial_schema.sql) uses a different
-- schema, so this migration adds the missing columns and relaxes the legacy
-- NOT NULL constraints that would otherwise block the new simple insert.
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).

-- ---------------------------------------------------------------------------
-- 1. Add missing columns required by POST /api/shipments
-- ---------------------------------------------------------------------------
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS item_description TEXT,
  ADD COLUMN IF NOT EXISTS origin           TEXT,
  ADD COLUMN IF NOT EXISTS destination      TEXT;

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
-- 3. RLS policy so the backend endpoint (using the anon key) can INSERT.
--    Same pattern as the quotes table ("Anyone can submit a quote").
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create shipments via API" ON public.shipments;
CREATE POLICY "Anyone can create shipments via API"
  ON public.shipments FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. VERIFICATION
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'shipments'
ORDER BY ordinal_position;

