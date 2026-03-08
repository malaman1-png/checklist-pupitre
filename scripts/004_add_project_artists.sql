-- Add artist selection columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_artist_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_artists JSONB DEFAULT '[]'::jsonb;
