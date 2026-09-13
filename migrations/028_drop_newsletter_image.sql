-- Remove the hero image column from newsletters.
-- Images are now inserted inline via the visual editor body,
-- so the separate hero image field is no longer used.
ALTER TABLE newsletters DROP COLUMN IF EXISTS image;
