-- Remove body_markdown now that the visual editor (body_json/body_html) is the sole source of truth.
ALTER TABLE newsletters DROP COLUMN body_markdown;
ALTER TABLE newsletters ALTER COLUMN body_json SET NOT NULL;
ALTER TABLE newsletters ALTER COLUMN body_html SET NOT NULL;
