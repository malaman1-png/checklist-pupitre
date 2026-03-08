-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artists_all" ON artists FOR ALL USING (true) WITH CHECK (true);

-- Create artist_items table (artist -> materiel relation with qty)
CREATE TABLE IF NOT EXISTS artist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE artist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artist_items_all" ON artist_items FOR ALL USING (true) WITH CHECK (true);

-- Seed default artists
INSERT INTO artists (name, color) VALUES
  ('Steph',  '#ef4444'),
  ('Kev',    '#f97316'),
  ('Laury',  '#eab308'),
  ('Eric',   '#22c55e'),
  ('Thib',   '#06b6d4'),
  ('Lucas',  '#3b82f6'),
  ('Gouri',  '#8b5cf6'),
  ('Ali',    '#ec4899'),
  ('Laura',  '#f43f5e')
ON CONFLICT (name) DO NOTHING;
