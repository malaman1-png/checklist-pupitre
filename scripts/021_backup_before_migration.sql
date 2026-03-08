-- Backup tables before template migration
-- Run BEFORE any other migration script
-- These tables can be used to rollback if needed

CREATE TABLE IF NOT EXISTS _backup_son_items AS SELECT * FROM son_items;
CREATE TABLE IF NOT EXISTS _backup_light_items AS SELECT * FROM light_items;
CREATE TABLE IF NOT EXISTS _backup_projects AS SELECT * FROM projects;
CREATE TABLE IF NOT EXISTS _backup_checklist_items AS SELECT * FROM checklist_items;
CREATE TABLE IF NOT EXISTS _backup_settings AS SELECT * FROM settings;
