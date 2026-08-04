-- Pause all existing subscribers so the cron won't pick them up.
-- Only subscribers who click the restart button on their chart page
-- will have next_send_at set again.
UPDATE subscribers SET next_send_at = NULL;
