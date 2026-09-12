-- Track what was last synced to Resend for each subscriber.
-- Enables instant local comparison without calling the Resend API.
CREATE TABLE contact_sync_state (
  subscriber_id  uuid PRIMARY KEY REFERENCES subscribers(id),
  synced_at      timestamptz NOT NULL DEFAULT now(),
  synced_values  jsonb NOT NULL
);
