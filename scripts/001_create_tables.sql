-- ===========================================
-- Checklist Pupitre - Database Schema
-- ===========================================

-- 1. Types (categories for grouping items)
CREATE TABLE IF NOT EXISTS types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  opacity REAL NOT NULL DEFAULT 0.15,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "types_public_read" ON types FOR SELECT USING (true);
CREATE POLICY "types_public_insert" ON types FOR INSERT WITH CHECK (true);
CREATE POLICY "types_public_update" ON types FOR UPDATE USING (true);
CREATE POLICY "types_public_delete" ON types FOR DELETE USING (true);

-- 2. Materiel (equipment items)
CREATE TABLE IF NOT EXISTS materiel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES types(id) ON DELETE CASCADE,
  calc_mode TEXT NOT NULL DEFAULT 'MAX' CHECK (calc_mode IN ('MAX', 'SUM')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE materiel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiel_public_read" ON materiel FOR SELECT USING (true);
CREATE POLICY "materiel_public_insert" ON materiel FOR INSERT WITH CHECK (true);
CREATE POLICY "materiel_public_update" ON materiel FOR UPDATE USING (true);
CREATE POLICY "materiel_public_delete" ON materiel FOR DELETE USING (true);

-- 3. Son items (sound equipment + quantities)
CREATE TABLE IF NOT EXISTS son_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE son_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "son_items_public_read" ON son_items FOR SELECT USING (true);
CREATE POLICY "son_items_public_insert" ON son_items FOR INSERT WITH CHECK (true);
CREATE POLICY "son_items_public_update" ON son_items FOR UPDATE USING (true);
CREATE POLICY "son_items_public_delete" ON son_items FOR DELETE USING (true);

-- 4. Light items (lighting equipment + quantities)
CREATE TABLE IF NOT EXISTS light_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE light_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "light_items_public_read" ON light_items FOR SELECT USING (true);
CREATE POLICY "light_items_public_insert" ON light_items FOR INSERT WITH CHECK (true);
CREATE POLICY "light_items_public_update" ON light_items FOR UPDATE USING (true);
CREATE POLICY "light_items_public_delete" ON light_items FOR DELETE USING (true);

-- 5. Fixed acts (actes fixes)
CREATE TABLE IF NOT EXISTS fixed_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fixed_acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixed_acts_public_read" ON fixed_acts FOR SELECT USING (true);
CREATE POLICY "fixed_acts_public_insert" ON fixed_acts FOR INSERT WITH CHECK (true);
CREATE POLICY "fixed_acts_public_update" ON fixed_acts FOR UPDATE USING (true);
CREATE POLICY "fixed_acts_public_delete" ON fixed_acts FOR DELETE USING (true);

-- 6. Fixed act items (objects for each fixed act)
CREATE TABLE IF NOT EXISTS fixed_act_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_act_id UUID NOT NULL REFERENCES fixed_acts(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fixed_act_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixed_act_items_public_read" ON fixed_act_items FOR SELECT USING (true);
CREATE POLICY "fixed_act_items_public_insert" ON fixed_act_items FOR INSERT WITH CHECK (true);
CREATE POLICY "fixed_act_items_public_update" ON fixed_act_items FOR UPDATE USING (true);
CREATE POLICY "fixed_act_items_public_delete" ON fixed_act_items FOR DELETE USING (true);

-- 7. Modular acts (actes modulables - TETRA, BUGGENG, etc.)
CREATE TABLE IF NOT EXISTS modular_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE modular_acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modular_acts_public_read" ON modular_acts FOR SELECT USING (true);
CREATE POLICY "modular_acts_public_insert" ON modular_acts FOR INSERT WITH CHECK (true);
CREATE POLICY "modular_acts_public_update" ON modular_acts FOR UPDATE USING (true);
CREATE POLICY "modular_acts_public_delete" ON modular_acts FOR DELETE USING (true);

-- 8. Modular act variants (items per artist count: 2/3/4/5)
CREATE TABLE IF NOT EXISTS modular_act_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modular_act_id UUID NOT NULL REFERENCES modular_acts(id) ON DELETE CASCADE,
  artist_count INT NOT NULL CHECK (artist_count IN (2, 3, 4, 5)),
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE modular_act_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modular_act_variants_public_read" ON modular_act_variants FOR SELECT USING (true);
CREATE POLICY "modular_act_variants_public_insert" ON modular_act_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "modular_act_variants_public_update" ON modular_act_variants FOR UPDATE USING (true);
CREATE POLICY "modular_act_variants_public_delete" ON modular_act_variants FOR DELETE USING (true);

-- 9. Projects (checklists created on show day)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  include_son BOOLEAN NOT NULL DEFAULT false,
  include_light BOOLEAN NOT NULL DEFAULT false,
  generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_public_read" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_public_insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_public_update" ON projects FOR UPDATE USING (true);
CREATE POLICY "projects_public_delete" ON projects FOR DELETE USING (true);

-- 10. Project selected fixed acts
CREATE TABLE IF NOT EXISTS project_fixed_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fixed_act_id UUID NOT NULL REFERENCES fixed_acts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_fixed_acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_fixed_acts_public_read" ON project_fixed_acts FOR SELECT USING (true);
CREATE POLICY "project_fixed_acts_public_insert" ON project_fixed_acts FOR INSERT WITH CHECK (true);
CREATE POLICY "project_fixed_acts_public_update" ON project_fixed_acts FOR UPDATE USING (true);
CREATE POLICY "project_fixed_acts_public_delete" ON project_fixed_acts FOR DELETE USING (true);

-- 11. Project selected modular acts (with artist count)
CREATE TABLE IF NOT EXISTS project_modular_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  modular_act_id UUID NOT NULL REFERENCES modular_acts(id) ON DELETE CASCADE,
  artist_count INT NOT NULL CHECK (artist_count IN (2, 3, 4, 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_modular_acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_modular_acts_public_read" ON project_modular_acts FOR SELECT USING (true);
CREATE POLICY "project_modular_acts_public_insert" ON project_modular_acts FOR INSERT WITH CHECK (true);
CREATE POLICY "project_modular_acts_public_update" ON project_modular_acts FOR UPDATE USING (true);
CREATE POLICY "project_modular_acts_public_delete" ON project_modular_acts FOR DELETE USING (true);

-- 12. Generated checklist items (the final checklist with check state)
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES types(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_items_public_read" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "checklist_items_public_insert" ON checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "checklist_items_public_update" ON checklist_items FOR UPDATE USING (true);
CREATE POLICY "checklist_items_public_delete" ON checklist_items FOR DELETE USING (true);

-- 13. Settings (app-wide settings)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  font_size TEXT NOT NULL DEFAULT 'M' CHECK (font_size IN ('S', 'M', 'L', 'XXL')),
  spacing TEXT NOT NULL DEFAULT 'normal' CHECK (spacing IN ('compact', 'normal', 'wide')),
  big_fingers BOOLEAN NOT NULL DEFAULT false,
  confetti_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_delete_days INT NOT NULL DEFAULT 0,
  mobile_back_confirm_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_public_insert" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_public_update" ON settings FOR UPDATE USING (true);
CREATE POLICY "settings_public_delete" ON settings FOR DELETE USING (true);

-- Insert default settings row
INSERT INTO settings (font_size, spacing, big_fingers, confetti_enabled, sound_enabled, auto_delete_days, mobile_back_confirm_enabled)
VALUES ('M', 'normal', false, true, true, 0, true);
