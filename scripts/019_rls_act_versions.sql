-- Add RLS policies for act_versions and act_version_items tables
-- These were created after the initial RLS migration

-- act_versions: SELECT for everyone, writes only via service_role
ALTER TABLE act_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "act_versions_anon_select" ON act_versions;
CREATE POLICY "act_versions_anon_select" ON act_versions FOR SELECT USING (true);

-- act_version_items: SELECT for everyone, writes only via service_role
ALTER TABLE act_version_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "act_version_items_anon_select" ON act_version_items;
CREATE POLICY "act_version_items_anon_select" ON act_version_items FOR SELECT USING (true);
