-- Track welcome series resend progress independently from next_step.
-- NULL = no resend in progress. 1-3 = next welcome day to send.
-- This preserves the subscriber's newsletter position (next_step)
-- when they restart the welcome series.
ALTER TABLE subscribers ADD COLUMN welcome_resend_step integer;
