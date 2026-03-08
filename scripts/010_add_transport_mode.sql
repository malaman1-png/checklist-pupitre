ALTER TABLE projects ADD COLUMN IF NOT EXISTS transport_mode text NOT NULL DEFAULT 'car';
