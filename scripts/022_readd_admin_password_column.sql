-- Re-add editable admin password in settings (used by Control Room UI)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_password TEXT;

-- Ensure a value exists for the singleton settings row
UPDATE settings
SET admin_password = COALESCE(NULLIF(admin_password, ''), 'pupitre2026');

