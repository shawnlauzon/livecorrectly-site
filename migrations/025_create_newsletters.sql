-- Create newsletters table: stores newsletter content (replaces filesystem *.md files).
CREATE TABLE newsletters (
  number        int PRIMARY KEY,
  subject       text NOT NULL,
  preview       text NOT NULL DEFAULT '',
  slug          text UNIQUE,
  description   text NOT NULL DEFAULT '',
  image         text,                        -- hero image filename
  body_markdown text NOT NULL,
  postscripts   jsonb NOT NULL DEFAULT '[]',
  old_slugs     jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
