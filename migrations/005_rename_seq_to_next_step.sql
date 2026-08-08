-- Rename seq_position → next_step and shift to "next to send" semantics.
-- Also change next_send_at from timestamptz to date (only the date matters).

-- Rename column: seq_position → next_step
ALTER TABLE subscribers RENAME COLUMN seq_position TO next_step;

-- Shift to "next to send" semantics:
--   Old 5 (done) → new 6 (past last step)
--   Old N>0 (N drip emails sent) → new N+1
UPDATE subscribers SET next_step = next_step + 1 WHERE next_step > 0;
--   Old 0 with next_send_at set (welcome0 sent, in pipeline) → new 1 (welcome1 is next)
UPDATE subscribers SET next_step = 1 WHERE next_step = 0 AND next_send_at IS NOT NULL;
--   Old 0 with null next_send_at (never started) → stays 0

-- Change next_send_at from timestamptz to date
ALTER TABLE subscribers ALTER COLUMN next_send_at TYPE date USING next_send_at::date;
