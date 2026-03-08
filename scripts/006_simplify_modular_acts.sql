-- Simplify modular_act_variants: remove artist_count, keep one list per act
-- Quantities are now "per artist" and will be multiplied at generation time

-- Remove artist_count column from modular_act_variants
-- First, deduplicate: keep only one row per (modular_act_id, materiel_id) with max quantity
-- Delete duplicates keeping the first inserted
DELETE FROM modular_act_variants a
USING modular_act_variants b
WHERE a.modular_act_id = b.modular_act_id
  AND a.materiel_id = b.materiel_id
  AND a.created_at > b.created_at;

-- Now drop the artist_count column
ALTER TABLE modular_act_variants DROP COLUMN IF EXISTS artist_count;

-- Drop the old CHECK constraint on project_modular_acts.artist_count
ALTER TABLE project_modular_acts DROP CONSTRAINT IF EXISTS project_modular_acts_artist_count_check;

-- Add new CHECK constraint allowing 1-5
ALTER TABLE project_modular_acts ADD CONSTRAINT project_modular_acts_artist_count_check CHECK (artist_count >= 1 AND artist_count <= 5);
