-- ════════════════════════════════════════════════════════════════════════════
--  Migration 007: TRACKING EVENTS (Live Shipment Tracking Timeline)
--  Idempotent — safe to run multiple times. Run in Supabase Dashboard → SQL Editor.
--
--  Adds/ensures the public.tracking_events table used by:
--    GET  /api/tracking-events/:shipmentId
--    POST /api/tracking-events
--
--  Table structure:
--    id          UUID PRIMARY KEY
--    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE
--    status      TEXT
--    location    TEXT
--    description TEXT
--    created_at  TIMESTAMPTZ DEFAULT NOW()
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Table (no-op if already created) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Index for timeline queries (filter by shipment, sort by created_at) ──
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id
  ON public.tracking_events (shipment_id, created_at ASC);

-- ── 3. Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Admins manage all events (uses the non-recursive is_admin() helper from 006)
DROP POLICY IF EXISTS "Admins can manage all tracking events" ON public.tracking_events;
CREATE POLICY "Admins can manage all tracking events"
  ON public.tracking_events FOR ALL
  USING (public.is_admin());

-- Customers can view events for their own shipments (mirrors status-updates RLS)
DROP POLICY IF EXISTS "Customers can view own shipment tracking events" ON public.tracking_events;
CREATE POLICY "Customers can view own shipment tracking events"
  ON public.tracking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.customer_id = auth.uid()
    )
  );

-- Anyone can add a tracking event via the public API (mirrors shipments insert policy)
DROP POLICY IF EXISTS "Anyone can add tracking events via API" ON public.tracking_events;
CREATE POLICY "Anyone can add tracking events via API"
  ON public.tracking_events FOR INSERT
  WITH CHECK (true);

-- ── 4. Reload PostgREST schema cache ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';

