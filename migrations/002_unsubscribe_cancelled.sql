-- Mark cancelled subscribers as unsubscribed.
-- These users had status=cancelled in the old system (Kit/ConvertKit export).

UPDATE subscribers
SET email_status = 'unsubscribed',
    email_status_at = now()
WHERE email IN (
  'nickcownie@gmail.com',
  'jearuh@yahoo.com',
  'tiararahyuni@gmail.com',
  'amandabfly@yahoo.com',
  'tamara.m.fields22@gmail.com',
  'meredith.norwood@gmail.com',
  'info@e-motionwellness.com',
  'samudepu@gmail.com',
  'suzanawellnesscoach@gmail.com',
  'ptitguss@hotmail.com',
  'princessm@gmx.net',
  'peter@zoneblue.nz',
  'marleypop@gmail.com'
)
AND email_status = 'active';
