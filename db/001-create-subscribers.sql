CREATE TABLE subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  first_name  TEXT NOT NULL,
  last_name   TEXT,
  birth_date  DATE NOT NULL,
  birth_time  TIME,
  time_unknown BOOLEAN NOT NULL DEFAULT false,
  birth_place TEXT NOT NULL,
  chart       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
