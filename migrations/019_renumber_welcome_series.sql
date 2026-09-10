-- Renumber welcome series from 0-based to 1-based and drop welcome3 (sales pitch).
--
-- Old mapping: 0=fresh, 1=welcome0 sent, 2=welcome1 sent, 3=welcome2 sent, 4+=newsletter
-- New mapping: 1=fresh, 2=welcome1 sent, 3=welcome2 sent, 4+=newsletter (welcome3 removed)

BEGIN;

-- 1. Move old step-3 subscribers (waiting for removed welcome3) to done
UPDATE subscribers SET next_step = 4 WHERE next_step = 3;

-- 2. Shift 2→3, 1→2, 0→1 (descending order avoids collisions)
UPDATE subscribers SET next_step = 3 WHERE next_step = 2;
UPDATE subscribers SET next_step = 2 WHERE next_step = 1;
UPDATE subscribers SET next_step = 1 WHERE next_step = 0;

-- 3. Shift welcome_resend_step (if any active resends)
UPDATE subscribers SET welcome_resend_step = NULL WHERE welcome_resend_step = 3;
UPDATE subscribers SET welcome_resend_step = 3 WHERE welcome_resend_step = 2;
UPDATE subscribers SET welcome_resend_step = 2 WHERE welcome_resend_step = 1;

-- 4. Change default for new rows
ALTER TABLE subscribers ALTER COLUMN next_step SET DEFAULT 1;

COMMIT;
