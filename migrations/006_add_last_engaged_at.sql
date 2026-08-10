-- Add last_engaged_at column to track subscriber engagement
ALTER TABLE subscribers ADD COLUMN last_engaged_at timestamptz;

-- Backfill existing rows with their creation date
UPDATE subscribers SET last_engaged_at = created_at;
