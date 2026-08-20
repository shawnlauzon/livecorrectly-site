-- Backfill: enroll existing welcome-complete subscribers into the newsletter sequence.
-- No schema change — just sets next_send_at so the newsletter cron picks them up.
-- next_step > 3 means they've completed the welcome series (WELCOME_SERIES_LENGTH = 3).

UPDATE subscribers
SET next_send_at = CURRENT_DATE + INTERVAL '7 days'
WHERE next_step > 3
  AND next_send_at IS NULL
  AND email_status = 'active';
