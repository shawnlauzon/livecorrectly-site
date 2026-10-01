-- Migration 037: Dated notes for newsletter sends.
--
-- A note is shown above the issue body of any newsletter sent on its
-- send_date (in the publication's timezone) — e.g. explaining a skipped week.
-- Notes are kept after their date as a record of what was said.

CREATE TABLE newsletter_notes (
  id            serial PRIMARY KEY,
  newsletter_id int NOT NULL REFERENCES newsletters(id),
  send_date     date NOT NULL,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (newsletter_id, send_date)
);
