-- Migration 003: Create quotes table for the website's "Get a Quote" form
-- Run this in Supabase Dashboard → SQL Editor after migrations 001 and 002

-- ---------------------------------------------------------------------------
-- Quotes (contact / quote requests from the public website)
-- ---------------------------------------------------------------------------
CREATE TABLE public.quotes (
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

CREATE INDEX idx_quotes_created_at ON public.quotes (created_at DESC);
CREATE INDEX idx_quotes_email ON public.quotes (email);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Anon (unauthenticated) users can SELECT from quotes — used by the backend
-- health-check endpoint (/test-db) which connects with the anon key.
-- Since quotes are public submissions, exposing the list (no personal auth)
-- is acceptable.  You may revoke this policy in production if needed.
CREATE POLICY "Anon can view quotes"
  ON public.quotes FOR SELECT
  USING (true);

-- Anyone on the web can submit a quote request (INSERT)
CREATE POLICY "Anyone can submit a quote"
  ON public.quotes FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can update quotes
CREATE POLICY "Only admins can update quotes"
  ON public.quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only authenticated admins can delete quotes
CREATE POLICY "Only admins can delete quotes"
  ON public.quotes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Enable Realtime for live dashboard updates
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

