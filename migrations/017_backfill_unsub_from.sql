-- Backfill unsub_from for unsubscribed subscribers where the column was NULL
-- because the column was added after they had already unsubscribed.
--
-- Group A: Infer from next_step (last cron email = next_step - 1)
-- Excludes: migration-batch unsubscribes (all timestamped 2026-07-31T02:28:44.627Z)
--           and next_step=4 subscribers created before the new system (picked up by Group B).
-- Targets: Padmini (welcome2), Michelle/Pamela/Yashas/Sana (newsletter_5)
UPDATE subscribers
SET unsub_from = CASE
  WHEN next_step >= 5 THEN 'newsletter_' || (next_step - 1)
  WHEN next_step >= 2 THEN 'welcome' || (next_step - 1)
  WHEN next_step = 1 THEN 'welcome0'
  ELSE NULL
END
WHERE email_status = 'unsubscribed'
  AND unsub_from IS NULL
  AND email_status_at != '2026-07-31T02:28:44.627Z'
  AND (
    next_step != 4
    OR created_at >= '2026-07-28'
  );

-- Group B: Infer from broadcast_sends (re-engagement broadcast triggered unsubscribe)
-- These 3 (Sari, Dave, Christian) were migrated at next_step=4, never received
-- cron emails, but received the reengagement-2026-08 broadcast right before unsubscribing.
UPDATE subscribers
SET unsub_from = 'reengagement-2026-08'
WHERE email_status = 'unsubscribed'
  AND unsub_from IS NULL
  AND id IN (
    SELECT subscriber_id FROM broadcast_sends
    WHERE broadcast_slug = 'reengagement-2026-08'
  );
