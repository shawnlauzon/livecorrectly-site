-- Migration 020: Unified email tracking
--
-- Creates email_sends and email_events tables to replace scattered tracking:
-- - broadcast_sends (per-subscriber dedup) → email_sends
-- - newsletter_sends (global send dates) → email_sends
-- - subscribers.last_engaged_at → MAX(email_events.occurred_at)
-- - subscribers.unsub_from → unsubscribe event in email_events

-- 1. Create new tables

CREATE TABLE email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id),
  email_type text NOT NULL,
  category text NOT NULL,
  resend_email_id text,
  resend_broadcast_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, email_type)
);
CREATE INDEX idx_email_sends_type ON email_sends (email_type, sent_at);

CREATE TABLE email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES subscribers(id),
  email_send_id uuid REFERENCES email_sends(id),
  event_type text NOT NULL,
  email_type text NOT NULL,
  link_url text,
  resend_email_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_events_subscriber ON email_events (subscriber_id, occurred_at DESC);
CREATE INDEX idx_email_events_type ON email_events (email_type, event_type);

-- 2. Migrate broadcast_sends → email_sends

INSERT INTO email_sends (subscriber_id, email_type, category, sent_at)
SELECT subscriber_id, 'broadcast_' || broadcast_slug, 'broadcast', sent_at
FROM broadcast_sends
ON CONFLICT DO NOTHING;

-- 3. Migrate newsletter_sends → email_sends (global → per-subscriber)
-- A subscriber received newsletter N if their current next_step > N
-- (next_step IS the newsletter number they're due for next).

INSERT INTO email_sends (subscriber_id, email_type, category, sent_at)
SELECT s.id, 'newsletter_' || ns.newsletter_number, 'newsletter', ns.sent_at
FROM newsletter_sends ns
CROSS JOIN subscribers s
WHERE s.next_step > ns.newsletter_number
ON CONFLICT DO NOTHING;

-- 4. Migrate unsub_from → email_events (unsubscribe events)
-- For subscribers who unsubscribed and have an unsub_from value,
-- create an unsubscribe event with the email_type from unsub_from.

INSERT INTO email_events (subscriber_id, event_type, email_type, occurred_at)
SELECT id, 'unsubscribe', unsub_from, email_status_at
FROM subscribers
WHERE email_status = 'unsubscribed'
  AND unsub_from IS NOT NULL
  AND email_status_at IS NOT NULL;

-- 5. Drop old tables

DROP TABLE broadcast_sends;
DROP TABLE newsletter_sends;

-- 6. Drop columns from subscribers

ALTER TABLE subscribers DROP COLUMN last_engaged_at;
ALTER TABLE subscribers DROP COLUMN unsub_from;
