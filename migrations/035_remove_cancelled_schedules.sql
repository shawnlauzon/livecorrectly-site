-- Migration 035: "Cancel" now unschedules — the schedule row is deleted rather
-- than kept with status 'cancelled'. Remove the existing cancelled rows (their
-- email_sends were already deleted at cancel time) and restrict status.

DELETE FROM newsletter_schedules WHERE status = 'cancelled';

ALTER TABLE newsletter_schedules
  ADD CONSTRAINT newsletter_schedules_status_check CHECK (status IN ('scheduled', 'sent'));
