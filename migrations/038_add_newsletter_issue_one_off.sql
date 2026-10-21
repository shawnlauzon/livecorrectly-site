-- Migration 038: One-off newsletter issues.
--
-- A one-off issue is sent once, to a segment the admin picks, and is not part
-- of the series: it never advances subscribers' next_step or a segment's
-- next_issue, and never appears on the web. One-offs are numbered from
-- ONE_OFF_NUMBER_BASE (lib/newsletter/one-off.ts) so they never take a series
-- slot; every check uses this column, not the number range.

ALTER TABLE newsletter_issues
  ADD COLUMN one_off boolean NOT NULL DEFAULT false;
