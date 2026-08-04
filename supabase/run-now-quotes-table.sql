-- ════════════════════════════════════════════════════════════════════════════════
--  RUN THIS IN SUPABASE DASHBOARD → SQL EDITOR
--  This creates the "quotes" table if it doesn't exist, and sets up the correct
--  RLS policies so the backend /test-db endpoint (using the anon key) can
--  SELECT from it.
-- ════════════════════════════════════════════════════════════════════════════════

-- Create the table (IF NOT EXISTS so it's safe to run multiple times)
CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT NOT NULL,
  service         TEXT NOT NULL,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  vehicle_details TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON public.quotes (email);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anon can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can submit a quote" ON public.quotes;
DROP POLICY IF EXISTS "Only admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Only admins can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;

-- ══════════════════════════════════════════════════════════════════════════
--  CORRECT POLICIES
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Anon (unauthenticated) users can SELECT — required for backend health
--    check endpoint (/test-db) which connects with the anon key.
CREATE POLICY "Anon can view quotes"
  ON public.quotes FOR SELECT
  USING (true);

-- 2. Anyone on the web can submit a quote request (INSERT)
CREATE POLICY "Anyone can submit a quote"
  ON public.quotes FOR INSERT
  WITH CHECK (true);

-- 3. Only authenticated admins can update quotes
CREATE POLICY "Only admins can update quotes"
  ON public.quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. Only authenticated admins can delete quotes
CREATE POLICY "Only admins can delete quotes"
  ON public.quotes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Enable Realtime (safe to run multiple times)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.quotes;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

-- ════════════════════════════════════════════════════════════════════════════════
--  VERIFICATION
-- ════════════════════════════════════════════════════════════════════════════════
SELECT '✅ quotes table is ready' AS status;

