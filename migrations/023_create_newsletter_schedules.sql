-- Newsletter scheduling table: tracks broadcasts created via the admin UI.
-- The cron uses this to know which newsletters have been "published" and
-- should be sent to catch-up subscribers.

CREATE TABLE newsletter_schedules (
  id               serial PRIMARY KEY,
  newsletter_num   int NOT NULL,
  broadcast_id     text NOT NULL,
  segment_id       text,
  scheduled_at     timestamptz NOT NULL,
  subscriber_count int NOT NULL,
  status           text NOT NULL DEFAULT 'scheduled',  -- scheduled | sent | cancelled
  created_at       timestamptz DEFAULT now()
);
