-- Park subscribers stuck at next_step=0 so they don't send
-- until we're ready. Set to -1 (held); update back to 0 to release.
UPDATE subscribers SET next_step = -1 WHERE next_step = 0;
