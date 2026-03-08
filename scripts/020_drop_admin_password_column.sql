-- Remove admin_password column from settings table
-- Password is now managed exclusively via ADMIN_PASSWORD environment variable
ALTER TABLE settings DROP COLUMN IF EXISTS admin_password;
