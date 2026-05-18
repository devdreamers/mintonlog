-- Share settings: single-row table for the public share token
CREATE TABLE IF NOT EXISTS share_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE share_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can validate the token (needed for /s/[token] pages)
CREATE POLICY "Public read" ON share_settings FOR SELECT USING (true);

-- Only authenticated users can update the token
CREATE POLICY "Auth write" ON share_settings FOR ALL TO authenticated USING (true);

-- Insert initial token
INSERT INTO share_settings DEFAULT VALUES ON CONFLICT DO NOTHING;
