-- Migration 034: Track what each newsletter schedule targeted, and switch the
-- publication cadence from a fixed timestamp to a weekly weekday + time.

-- 1. Schedules: kind (broadcast to a segment, or direct per-subscriber emails),
--    the persistent segment that received it, and direct-send email IDs.
ALTER TABLE newsletter_schedules
  ADD COLUMN kind text NOT NULL DEFAULT 'broadcast',
  ADD COLUMN newsletter_segment_id int REFERENCES newsletter_segments(id) ON DELETE SET NULL,
  ADD COLUMN resend_email_ids text[];
ALTER TABLE newsletter_schedules ALTER COLUMN broadcast_id DROP NOT NULL;

UPDATE newsletter_schedules SET newsletter_segment_id = 4 WHERE id = 8;  -- #8 → OGs
UPDATE newsletter_schedules SET newsletter_segment_id = 6 WHERE id = 9;  -- #5 → 2026-summer

-- 2. Publication cadence: weekly on send_weekday (0 = Sunday) at send_time,
--    in the publication's timezone. Backfilled from the old next_send_at.
ALTER TABLE newsletters
  ADD COLUMN send_weekday int CHECK (send_weekday BETWEEN 0 AND 6),
  ADD COLUMN send_time time;

UPDATE newsletters
SET send_weekday = extract(dow FROM next_send_at AT TIME ZONE timezone)::int,
    send_time = (next_send_at AT TIME ZONE timezone)::time
WHERE next_send_at IS NOT NULL;

ALTER TABLE newsletters DROP COLUMN next_send_at;
ALTER TABLE newsletters DROP COLUMN interval_days;
