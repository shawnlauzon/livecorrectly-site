-- Fix inflated next_step from old (longer) welcome series.
-- No newsletters have been sent yet, so cap at 4 (= completed welcome).
UPDATE subscribers SET next_step = 4 WHERE next_step > 4;

-- Drop next_send_at — cron schedule handles pacing, not a per-row date.
ALTER TABLE subscribers DROP COLUMN IF EXISTS next_send_at;
