-- Migration: Act Versions
-- Permet de créer plusieurs versions d'un même acte (ex: "Court", "Long")
-- Compatible avec fixed_acts et modular_acts existants

-- 1. Table des versions
CREATE TABLE IF NOT EXISTS act_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_type TEXT NOT NULL CHECK (act_type IN ('fixed', 'modular')),
  act_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(act_id, slug)
);

-- 2. Matériel spécifique à chaque version
CREATE TABLE IF NOT EXISTS act_version_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES act_versions(id) ON DELETE CASCADE,
  materiel_id UUID REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Étendre project_fixed_acts avec version_id
ALTER TABLE project_fixed_acts 
ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES act_versions(id) ON DELETE SET NULL;

-- 4. Étendre project_modular_acts avec version_id
ALTER TABLE project_modular_acts 
ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES act_versions(id) ON DELETE SET NULL;

-- 5. Index pour performances
CREATE INDEX IF NOT EXISTS idx_act_versions_act ON act_versions(act_type, act_id);
CREATE INDEX IF NOT EXISTS idx_act_version_items_version ON act_version_items(version_id);
CREATE INDEX IF NOT EXISTS idx_project_fixed_acts_version ON project_fixed_acts(version_id);
CREATE INDEX IF NOT EXISTS idx_project_modular_acts_version ON project_modular_acts(version_id);

-- 6. RLS policies (lecture publique, écriture admin uniquement)
ALTER TABLE act_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_version_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "act_versions_select" ON act_versions;
CREATE POLICY "act_versions_select" ON act_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "act_version_items_select" ON act_version_items;
CREATE POLICY "act_version_items_select" ON act_version_items FOR SELECT USING (true);
