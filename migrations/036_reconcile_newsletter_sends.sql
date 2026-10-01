-- Migration 036: Reconcile newsletter email_sends with what Resend actually sent.
--
-- Every recorded newsletter broadcast was compared address-by-address against
-- Resend's "sent" recipient list (2026-10-01). Three discrepancies:
--
-- 1. #4 — 14 missing. Broadcast 3ecfda5d ("[NOT TEST] Newsletter #4") was a
--    test send that went to the real 2026-summer segment immediately
--    (2026-09-14 23:22:57 UTC). Test sends record nothing. Those 14 are exactly
--    the recipients of the 2026-09-22 #5 broadcast (4ee0f1ae) to the same cohort.
--
-- 2. #7 — one record attributed to the wrong broadcast. kristinagerken04 is not
--    in the 2026-09-10 broadcast (02c38d56) but did receive #7 on 2026-09-15
--    (51d9fbd2). Count unchanged; attribution corrected.
--
-- 3. #8 — one record for someone Resend never sent to (broadcast 4b5de793):
--    puhanayuputri (unsubscribed before the send).
--
-- Resend lists shawn@livecorrectly.com as a recipient of #7 (51d9fbd2) and #8
-- (4b5de793). That is the subscriber now named shawn.lauzon@gmail.com (renamed
-- manually), so those deliveries are his and his records stand as-is.
--
-- Not covered: pre-broadcast sends (2026-08-26 / 2026-09-02, no broadcast id)
-- were individual emails and were not re-verified.

-- 1. #4: record the 2026-09-14 delivery to the 2026-summer cohort
INSERT INTO email_sends (subscriber_id, email_type, category, resend_broadcast_id, sent_at)
SELECT subscriber_id, 'newsletter_4', 'newsletter',
       '3ecfda5d-f3c7-48bd-86d7-13d11c19baf9', '2026-09-14 23:22:57+00'
FROM email_sends
WHERE resend_broadcast_id = '4ee0f1ae-ac8d-45a2-bc2b-6403306ff7be'
ON CONFLICT (subscriber_id, email_type) DO NOTHING;

-- 2. #7: attribute kristinagerken04's record to the broadcast that reached her
UPDATE email_sends e
SET resend_broadcast_id = '51d9fbd2-259c-4a2c-b3b8-e78e8f227029',
    sent_at = '2026-09-15 11:48:01+00'
FROM subscribers s
WHERE s.id = e.subscriber_id
  AND lower(s.email) = 'kristinagerken04@gmail.com'
  AND e.email_type = 'newsletter_7'
  AND e.resend_broadcast_id = '02c38d56-9ec7-4194-b272-a582e7823f97';

-- 3. #8: remove the record for a recipient Resend did not send to
DELETE FROM email_sends e
USING subscribers s
WHERE s.id = e.subscriber_id
  AND e.email_type = 'newsletter_8'
  AND e.resend_broadcast_id = '4b5de793-bd8c-4316-93ac-f7924743644d'
  AND lower(s.email) = 'puhanayuputri@gmail.com';
