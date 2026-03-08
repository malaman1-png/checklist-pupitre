-- Add artist_key column to checklist_items for per-artist costume tracking
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS artist_key TEXT DEFAULT NULL;
