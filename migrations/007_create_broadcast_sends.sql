-- Broadcast dedup tracking: one row per (subscriber, broadcast campaign).
-- Separate table because the "one table" philosophy applies to chart data,
-- not operational email tracking.
CREATE TABLE broadcast_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id),
  broadcast_slug text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, broadcast_slug)
);
