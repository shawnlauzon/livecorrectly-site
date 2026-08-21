-- Remove country suffix from birth_input.city values.
-- Old format: "San Diego (California), US"
-- New format: "San Diego (California)"
-- The city autocomplete changed at some point and started appending ", Country".
-- This strips everything from the first comma onward.

UPDATE subscribers
SET birth_input = jsonb_set(
  birth_input,
  '{city}',
  to_jsonb(split_part(birth_input->>'city', ',', 1))
)
WHERE birth_input->>'city' LIKE '%,%';
