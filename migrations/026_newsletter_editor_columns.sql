-- Add editor columns for visual newsletter editing.
-- body_json stores TipTap JSON from the editor; body_html stores pre-rendered HTML.
-- When body_json is populated, the send pipeline uses body_html instead of rendering from body_markdown.

ALTER TABLE newsletters
  ADD COLUMN body_json jsonb,
  ADD COLUMN body_html text;
