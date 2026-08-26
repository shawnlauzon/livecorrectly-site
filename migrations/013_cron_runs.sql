-- Idempotency guard: allows only one successful cron run per job per calendar day.
-- Prevents double-sends when Vercel triggers a cron twice (e.g., deployment during cron window).
CREATE TABLE cron_runs (
  cron_name TEXT NOT NULL,
  run_date DATE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (cron_name, run_date)
);

-- Backfill today's runs so a post-migration deploy doesn't re-trigger them.
INSERT INTO cron_runs (cron_name, run_date) VALUES
  ('newsletter', CURRENT_DATE),
  ('daily-emails', CURRENT_DATE);
