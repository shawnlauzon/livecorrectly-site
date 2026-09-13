-- Migration 027: Add liquid_section_map column to newsletters
-- Stores stable key assignments for Liquid dynamic sections so that
-- contact property keys are reused across schedule runs and removed
-- sections can be cleaned up.
ALTER TABLE newsletters ADD COLUMN liquid_section_map jsonb;
