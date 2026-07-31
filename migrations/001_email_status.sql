-- Add email status tracking columns to subscribers table.
-- Replaces the boolean `unsubscribed` column with a richer status enum
-- and adds a per-subscriber unsubscribe token for email links.

ALTER TABLE subscribers
  ADD COLUMN email_status text NOT NULL DEFAULT 'active',
  ADD COLUMN email_status_at timestamptz,
  ADD COLUMN unsub_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_subscribers_email_status ON subscribers (email_status);

-- Backfill: no existing rows are unsubscribed, so 'active' default covers them.
-- Drop the old boolean once confirmed:
-- ALTER TABLE subscribers DROP COLUMN unsubscribed;
