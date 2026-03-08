ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_son TEXT DEFAULT 'SON';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS label_light TEXT DEFAULT 'LIGHT';
UPDATE settings SET label_son = 'SON', label_light = 'LIGHT' WHERE label_son IS NULL;
