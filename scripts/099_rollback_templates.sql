-- ROLLBACK: Execute this script ONLY if the template migration needs to be undone
-- This will restore the app to its pre-migration state

-- 1. Drop new tables (cascade handles foreign keys)
DROP TABLE IF EXISTS tech_section_items CASCADE;
DROP TABLE IF EXISTS template_tech_sections CASCADE;
DROP TABLE IF EXISTS template_acts CASCADE;
DROP TABLE IF EXISTS template_artists CASCADE;
DROP TABLE IF EXISTS templates CASCADE;

-- 2. Remove template_id column from projects
ALTER TABLE projects DROP COLUMN IF EXISTS template_id;

-- 3. Restore data from backups
TRUNCATE son_items;
INSERT INTO son_items SELECT * FROM _backup_son_items;

TRUNCATE light_items;
INSERT INTO light_items SELECT * FROM _backup_light_items;

TRUNCATE projects;
INSERT INTO projects SELECT * FROM _backup_projects;

TRUNCATE checklist_items;
INSERT INTO checklist_items SELECT * FROM _backup_checklist_items;

TRUNCATE settings;
INSERT INTO settings SELECT * FROM _backup_settings;

-- 4. Clean up backup tables
DROP TABLE IF EXISTS _backup_son_items;
DROP TABLE IF EXISTS _backup_light_items;
DROP TABLE IF EXISTS _backup_projects;
DROP TABLE IF EXISTS _backup_checklist_items;
DROP TABLE IF EXISTS _backup_settings;
