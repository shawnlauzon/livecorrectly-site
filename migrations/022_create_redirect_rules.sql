CREATE TABLE redirect_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  property_type text NOT NULL,        -- 'type' | 'profile'
  property_value text NOT NULL,       -- 'Generator', '1/3', or '*' (default)
  destination_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slug, property_type, property_value)
);

CREATE INDEX idx_redirect_rules_slug ON redirect_rules (slug);
