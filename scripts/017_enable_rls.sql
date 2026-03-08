-- Lock down admin config tables: drop all write policies, keep SELECT only.
-- Admin writes go through service_role via API routes.
-- User-facing tables keep full anon access.

-- Helper: for each admin table, drop ALL existing policies then add SELECT-only.

-- === settings ===
DROP POLICY IF EXISTS "settings_public_delete" ON settings;
DROP POLICY IF EXISTS "settings_public_update" ON settings;
DROP POLICY IF EXISTS "settings_public_read" ON settings;
DROP POLICY IF EXISTS "settings_public_insert" ON settings;
DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_anon_read" ON settings FOR SELECT USING (true);

-- === types ===
DROP POLICY IF EXISTS "types_public_insert" ON types;
DROP POLICY IF EXISTS "types_public_update" ON types;
DROP POLICY IF EXISTS "types_public_delete" ON types;
DROP POLICY IF EXISTS "types_public_read" ON types;
DROP POLICY IF EXISTS "types_select" ON types;
CREATE POLICY "types_anon_read" ON types FOR SELECT USING (true);

-- === materiel ===
DROP POLICY IF EXISTS "materiel_public_insert" ON materiel;
DROP POLICY IF EXISTS "materiel_public_delete" ON materiel;
DROP POLICY IF EXISTS "materiel_public_read" ON materiel;
DROP POLICY IF EXISTS "materiel_public_update" ON materiel;
DROP POLICY IF EXISTS "materiel_select" ON materiel;
CREATE POLICY "materiel_anon_read" ON materiel FOR SELECT USING (true);

-- === artists ===
DROP POLICY IF EXISTS "artists_all" ON artists;
DROP POLICY IF EXISTS "artists_select" ON artists;
CREATE POLICY "artists_anon_read" ON artists FOR SELECT USING (true);

-- === fixed_acts ===
DROP POLICY IF EXISTS "fixed_acts_public_read" ON fixed_acts;
DROP POLICY IF EXISTS "fixed_acts_public_delete" ON fixed_acts;
DROP POLICY IF EXISTS "fixed_acts_public_insert" ON fixed_acts;
DROP POLICY IF EXISTS "fixed_acts_public_update" ON fixed_acts;
DROP POLICY IF EXISTS "fixed_acts_select" ON fixed_acts;
CREATE POLICY "fixed_acts_anon_read" ON fixed_acts FOR SELECT USING (true);

-- === fixed_act_items ===
DROP POLICY IF EXISTS "fixed_act_items_public_update" ON fixed_act_items;
DROP POLICY IF EXISTS "fixed_act_items_public_delete" ON fixed_act_items;
DROP POLICY IF EXISTS "fixed_act_items_public_insert" ON fixed_act_items;
DROP POLICY IF EXISTS "fixed_act_items_public_read" ON fixed_act_items;
CREATE POLICY "fixed_act_items_anon_read" ON fixed_act_items FOR SELECT USING (true);

-- === modular_acts ===
DROP POLICY IF EXISTS "modular_acts_public_update" ON modular_acts;
DROP POLICY IF EXISTS "modular_acts_public_delete" ON modular_acts;
DROP POLICY IF EXISTS "modular_acts_public_insert" ON modular_acts;
DROP POLICY IF EXISTS "modular_acts_public_read" ON modular_acts;
DROP POLICY IF EXISTS "modular_acts_select" ON modular_acts;
CREATE POLICY "modular_acts_anon_read" ON modular_acts FOR SELECT USING (true);

-- === modular_act_variants ===
DROP POLICY IF EXISTS "modular_act_variants_public_delete" ON modular_act_variants;
DROP POLICY IF EXISTS "modular_act_variants_public_update" ON modular_act_variants;
DROP POLICY IF EXISTS "modular_act_variants_public_read" ON modular_act_variants;
DROP POLICY IF EXISTS "modular_act_variants_public_insert" ON modular_act_variants;
CREATE POLICY "modular_act_variants_anon_read" ON modular_act_variants FOR SELECT USING (true);

-- === son_items ===
DROP POLICY IF EXISTS "son_items_public_delete" ON son_items;
DROP POLICY IF EXISTS "son_items_public_insert" ON son_items;
DROP POLICY IF EXISTS "son_items_public_read" ON son_items;
DROP POLICY IF EXISTS "son_items_public_update" ON son_items;
DROP POLICY IF EXISTS "son_items_select" ON son_items;
CREATE POLICY "son_items_anon_read" ON son_items FOR SELECT USING (true);

-- === light_items ===
DROP POLICY IF EXISTS "light_items_public_delete" ON light_items;
DROP POLICY IF EXISTS "light_items_public_insert" ON light_items;
DROP POLICY IF EXISTS "light_items_public_read" ON light_items;
DROP POLICY IF EXISTS "light_items_public_update" ON light_items;
DROP POLICY IF EXISTS "light_items_select" ON light_items;
CREATE POLICY "light_items_anon_read" ON light_items FOR SELECT USING (true);

-- === always_items ===
DROP POLICY IF EXISTS "always_items_public_update" ON always_items;
DROP POLICY IF EXISTS "always_items_public_select" ON always_items;
DROP POLICY IF EXISTS "always_items_public_insert" ON always_items;
DROP POLICY IF EXISTS "always_items_public_delete" ON always_items;
DROP POLICY IF EXISTS "always_items_select" ON always_items;
CREATE POLICY "always_items_anon_read" ON always_items FOR SELECT USING (true);

-- === artist_items ===
DROP POLICY IF EXISTS "artist_items_all" ON artist_items;
CREATE POLICY "artist_items_anon_read" ON artist_items FOR SELECT USING (true);

-- === display_order ===
DROP POLICY IF EXISTS "display_order_public" ON display_order;
DROP POLICY IF EXISTS "display_order_select" ON display_order;
CREATE POLICY "display_order_anon_read" ON display_order FOR SELECT USING (true);

-- === transport_global_additions ===
DROP POLICY IF EXISTS "public_access" ON transport_global_additions;
CREATE POLICY "tga_anon_read" ON transport_global_additions FOR SELECT USING (true);

-- === transport_global_exclusions ===
DROP POLICY IF EXISTS "public_access" ON transport_global_exclusions;
CREATE POLICY "tge_anon_read" ON transport_global_exclusions FOR SELECT USING (true);

-- === transport_global_replacements ===
DROP POLICY IF EXISTS "public_access" ON transport_global_replacements;
CREATE POLICY "tgr_anon_read" ON transport_global_replacements FOR SELECT USING (true);

-- === transport_act_additions ===
DROP POLICY IF EXISTS "public_access" ON transport_act_additions;
CREATE POLICY "taa_anon_read" ON transport_act_additions FOR SELECT USING (true);

-- === transport_act_exclusions ===
DROP POLICY IF EXISTS "public_access" ON transport_act_exclusions;
CREATE POLICY "tae_anon_read" ON transport_act_exclusions FOR SELECT USING (true);

-- === transport_act_replacements ===
DROP POLICY IF EXISTS "public_access" ON transport_act_replacements;
CREATE POLICY "tar_anon_read" ON transport_act_replacements FOR SELECT USING (true);

-- === USER-FACING TABLES (keep full anon read/write) ===
-- projects: already has individual policies, consolidate to one ALL policy
DROP POLICY IF EXISTS "projects_public_insert" ON projects;
DROP POLICY IF EXISTS "projects_public_delete" ON projects;
DROP POLICY IF EXISTS "projects_public_read" ON projects;
DROP POLICY IF EXISTS "projects_public_update" ON projects;
DROP POLICY IF EXISTS "projects_all" ON projects;
CREATE POLICY "projects_anon_all" ON projects FOR ALL USING (true) WITH CHECK (true);

-- checklist_items
DROP POLICY IF EXISTS "checklist_items_public_read" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_public_insert" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_public_delete" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_public_update" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_all" ON checklist_items;
CREATE POLICY "checklist_items_anon_all" ON checklist_items FOR ALL USING (true) WITH CHECK (true);

-- project_fixed_acts
DROP POLICY IF EXISTS "project_fixed_acts_public_update" ON project_fixed_acts;
DROP POLICY IF EXISTS "project_fixed_acts_public_delete" ON project_fixed_acts;
DROP POLICY IF EXISTS "project_fixed_acts_public_insert" ON project_fixed_acts;
DROP POLICY IF EXISTS "project_fixed_acts_public_read" ON project_fixed_acts;
DROP POLICY IF EXISTS "project_fixed_acts_all" ON project_fixed_acts;
CREATE POLICY "project_fixed_acts_anon_all" ON project_fixed_acts FOR ALL USING (true) WITH CHECK (true);

-- project_modular_acts
DROP POLICY IF EXISTS "project_modular_acts_public_delete" ON project_modular_acts;
DROP POLICY IF EXISTS "project_modular_acts_public_update" ON project_modular_acts;
DROP POLICY IF EXISTS "project_modular_acts_public_read" ON project_modular_acts;
DROP POLICY IF EXISTS "project_modular_acts_public_insert" ON project_modular_acts;
DROP POLICY IF EXISTS "project_modular_acts_all" ON project_modular_acts;
CREATE POLICY "project_modular_acts_anon_all" ON project_modular_acts FOR ALL USING (true) WITH CHECK (true);
