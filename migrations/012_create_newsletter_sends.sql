CREATE TABLE newsletter_sends (
  newsletter_number int PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);
