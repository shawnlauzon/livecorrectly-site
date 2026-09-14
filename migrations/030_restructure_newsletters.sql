-- Restructure newsletter data model:
-- - Rename "newsletters" (issue content) → "newsletter_issues"
-- - Create new "newsletters" table for the publication entity (schedule, cadence)
-- - Link newsletter_issues back to the publication via newsletter_id

-- 1. Rename the existing content table
ALTER TABLE newsletters RENAME TO newsletter_issues;

-- 2. Create the publication table
CREATE TABLE newsletters (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  next_send_at  timestamptz,
  interval_days int NOT NULL DEFAULT 7,
  timezone      text NOT NULL DEFAULT 'America/Chicago',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Seed the default publication
INSERT INTO newsletters (name, interval_days, timezone)
VALUES ('Live Correctly Weekly', 7, 'America/Chicago');

-- 4. Add foreign key from issues → publication
ALTER TABLE newsletter_issues ADD COLUMN newsletter_id int REFERENCES newsletters(id);
UPDATE newsletter_issues SET newsletter_id = 1;
ALTER TABLE newsletter_issues ALTER COLUMN newsletter_id SET NOT NULL;
