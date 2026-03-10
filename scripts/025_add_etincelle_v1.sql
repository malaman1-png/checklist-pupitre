-- Etincelle V1: isolated config tables + project selector

-- 1) Project-level selector
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS spectacle TEXT NOT NULL DEFAULT 'pupitre'
CHECK (spectacle IN ('pupitre', 'etincelle'));

-- 2) Etincelle versions
CREATE TABLE IF NOT EXISTS etincelle_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link selected version to project
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS etincelle_version_id UUID REFERENCES etincelle_versions(id) ON DELETE SET NULL;

-- 3) Version materials
CREATE TABLE IF NOT EXISTS etincelle_version_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES etincelle_versions(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Sound system list (specific to Etincelle)
CREATE TABLE IF NOT EXISTS etincelle_sound_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Artist-specific list for Etincelle
CREATE TABLE IF NOT EXISTS etincelle_artist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_projects_spectacle ON projects(spectacle);
CREATE INDEX IF NOT EXISTS idx_projects_etincelle_version ON projects(etincelle_version_id);
CREATE INDEX IF NOT EXISTS idx_etincelle_version_items_version ON etincelle_version_items(version_id);
CREATE INDEX IF NOT EXISTS idx_etincelle_artist_items_artist ON etincelle_artist_items(artist_id);

-- 7) RLS + readonly policies for anon
ALTER TABLE etincelle_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etincelle_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE etincelle_sound_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE etincelle_artist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etincelle_versions_anon_read" ON etincelle_versions;
CREATE POLICY "etincelle_versions_anon_read"
ON etincelle_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "etincelle_version_items_anon_read" ON etincelle_version_items;
CREATE POLICY "etincelle_version_items_anon_read"
ON etincelle_version_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "etincelle_sound_items_anon_read" ON etincelle_sound_items;
CREATE POLICY "etincelle_sound_items_anon_read"
ON etincelle_sound_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "etincelle_artist_items_anon_read" ON etincelle_artist_items;
CREATE POLICY "etincelle_artist_items_anon_read"
ON etincelle_artist_items FOR SELECT USING (true);

-- 8) Default versions
INSERT INTO etincelle_versions (name, slug, sort_order)
VALUES
  ('courte 20min', 'courte-20min', 0),
  ('longue 30min', 'longue-30min', 1)
ON CONFLICT (slug) DO NOTHING;
