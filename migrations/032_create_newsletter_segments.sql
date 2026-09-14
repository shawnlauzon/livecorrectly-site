CREATE TABLE newsletter_segments (
  id            serial PRIMARY KEY,
  newsletter_id int NOT NULL REFERENCES newsletters(id),
  name          text NOT NULL,
  resend_segment_id text NOT NULL,
  next_issue    int NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
