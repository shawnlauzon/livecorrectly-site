-- Migration 021: Fix newsletter_6 email_sends dates and broadcast IDs
--
-- Newsletter #6 was sent in two batches:
--   Batch 1 (Sep 2): 72 subscribers, sent transactionally (not via broadcast)
--   Batch 2 (Sep 10): 43 active subscribers, sent via Resend broadcast 3c0b0db0-...
--   + 3 failed subscribers who failed before Sep 2 (batch 1, not batch 2)
--
-- Migration 020 gave all 118 rows the same sent_at from newsletter_sends (Sep 2).
-- The backfill script then set resend_broadcast_id on ALL rows to the Sep 10
-- broadcast ID, even though batch 1 was sent transactionally.
--
-- This migration fixes both issues:
--   1. Updates sent_at for the 43 batch 2 subscribers to Sep 10
--   2. Clears resend_broadcast_id for the 75 batch 1 subscribers

-- 1. Fix batch 2 sent_at (43 active subscribers who have newsletter_6 but not newsletter_7)
UPDATE email_sends
SET sent_at = '2026-09-10T11:05:31.794118+00'
WHERE email_type = 'newsletter_6'
  AND subscriber_id IN (
    SELECT es.subscriber_id
    FROM email_sends es
    JOIN subscribers s ON s.id = es.subscriber_id
    WHERE es.email_type = 'newsletter_6'
      AND s.email_status = 'active'
      AND es.subscriber_id NOT IN (
        SELECT subscriber_id FROM email_sends WHERE email_type = 'newsletter_7'
      )
  );

-- 2. Fix batch 1 broadcast_id (75 subscribers: 72 with newsletter_7 + 3 failed)
-- These were sent transactionally, not via broadcast — clear the incorrect broadcast ID
UPDATE email_sends
SET resend_broadcast_id = NULL
WHERE email_type = 'newsletter_6'
  AND subscriber_id NOT IN (
    SELECT es.subscriber_id
    FROM email_sends es
    JOIN subscribers s ON s.id = es.subscriber_id
    WHERE es.email_type = 'newsletter_6'
      AND s.email_status = 'active'
      AND es.subscriber_id NOT IN (
        SELECT subscriber_id FROM email_sends WHERE email_type = 'newsletter_7'
      )
  );
