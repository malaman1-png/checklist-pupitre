-- Add admin_password column to settings table with default "prout"
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_password TEXT NOT NULL DEFAULT 'prout';
