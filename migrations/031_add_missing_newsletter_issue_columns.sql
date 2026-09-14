-- Migration 031: Catch up newsletter_issues schema
-- Migrations 027 (add liquid_section_map) and 028 (drop image) were skipped
-- before 030 renamed the table. Apply both changes now.

ALTER TABLE newsletter_issues ADD COLUMN liquid_section_map jsonb;
ALTER TABLE newsletter_issues DROP COLUMN image;
