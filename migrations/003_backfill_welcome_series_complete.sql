-- Add welcome series tracking columns.
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS seq_position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz;

-- Mark all existing subscribers as having completed the welcome series,
-- EXCEPT for the 16 users who still need to receive it.

UPDATE subscribers
SET seq_position = 5,
    next_send_at = NULL
WHERE email NOT IN (
  'sara@yopmail.com',
  'runnercityrequest@gmail.com',
  'sarahaugustawozniak@gmail.com',
  'eeniren@gmail.com',
  'callhernda@gmail.com',
  'milespaulc23@gmail.com',
  'francine.s.levesque@gmail.com',
  'chrislowther28@gmail.com',
  'shelly.tuilaepa@gmail.com',
  'dexterjensen@protonmail.com',
  'barbara@textblueten.com',
  'rfuentes.candia@gmail.com',
  'ignateva-1980@mail.ru',
  'sdc.births@gmail.com',
  'murdock.cameron@gmail.com',
  'deya.soto@gmail.com'
);
