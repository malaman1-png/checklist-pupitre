-- Add batch_id column to checklist_items for safe non-destructive regeneration
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS batch_id uuid;
