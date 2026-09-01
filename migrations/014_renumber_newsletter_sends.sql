-- Shift newsletter_number in newsletter_sends to match the new file numbering.
-- Files were renamed: 01.md -> 04.md, 02.md -> 05.md, 03.md -> 06.md.
-- This adds 3 to each existing record so the numbers match the new filenames
-- and align with subscriber.next_step (welcome series is steps 0-3,
-- newsletters start at step 4).

UPDATE newsletter_sends
SET newsletter_number = newsletter_number + 3;
