-- Add mobile_back_confirm_enabled to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS mobile_back_confirm_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update existing default settings row to include new field
UPDATE settings SET mobile_back_confirm_enabled = true WHERE mobile_back_confirm_enabled IS NULL;
