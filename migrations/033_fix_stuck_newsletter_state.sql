-- Migration 033: Repair newsletter state corrupted by the old completion logic.
--
-- Schedule 8 (newsletter #8 → OGs) was sent by Resend on 2026-09-22 but never
-- marked sent: one recipient unsubscribed before the send, so no email.sent
-- webhook arrived and the per-recipient "pending" count never reached zero.
--
-- Segment 6 (2026-summer) was advanced once per concurrent email.sent webhook
-- (non-atomic check-then-increment), landing on 19 instead of 6.

UPDATE newsletter_schedules SET status = 'sent' WHERE id = 8 AND status = 'scheduled';
UPDATE newsletter_segments SET next_issue = 9 WHERE id = 4;   -- OGs
UPDATE newsletter_segments SET next_issue = 6 WHERE id = 6;   -- 2026-summer
