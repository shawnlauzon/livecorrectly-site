-- Migration 009: Replace birth columns with single birth_input JSONB column
--
-- birth_input stores the user's original form inputs:
--   { date, time, timeUnknown, city, country }

-- Step 1: Add the new column (nullable initially for backfill)
ALTER TABLE subscribers ADD COLUMN birth_input jsonb;

-- Step 2: Backfill from existing columns + chart metadata for country
-- Country comes from chart.meta.birthData.location.country which may be:
--   - a string (e.g. "US") in newer charts
--   - an object { id: "US", name: "United States", ... } in older charts
UPDATE subscribers SET birth_input = jsonb_build_object(
  'date', to_char(birth_date, 'YYYY-MM-DD'),
  'time', CASE
    WHEN birth_time IS NOT NULL THEN substring(birth_time::text FROM 1 FOR 5)
    ELSE NULL
  END,
  'timeUnknown', time_unknown,
  'city', birth_place,
  'country', CASE
    WHEN jsonb_typeof(chart->'meta'->'birthData'->'location'->'country') = 'string'
      THEN chart->'meta'->'birthData'->'location'->'country'
    WHEN chart->'meta'->'birthData'->'location'->'country'->>'id' IS NOT NULL
      THEN to_jsonb(chart->'meta'->'birthData'->'location'->'country'->>'id')
    ELSE '"US"'::jsonb
  END
);

-- Step 3: Set NOT NULL
ALTER TABLE subscribers ALTER COLUMN birth_input SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE subscribers DROP COLUMN birth_date;
ALTER TABLE subscribers DROP COLUMN birth_time;
ALTER TABLE subscribers DROP COLUMN time_unknown;
ALTER TABLE subscribers DROP COLUMN birth_place;
ALTER TABLE subscribers DROP COLUMN birth_lat;
ALTER TABLE subscribers DROP COLUMN birth_lng;
