-- Check and make materiel_id nullable (drop FK, re-add with ON DELETE SET NULL)
-- First drop existing foreign key if any
DO $$
BEGIN
  -- Try to drop the FK constraint (name may vary)
  BEGIN
    ALTER TABLE checklist_items DROP CONSTRAINT IF EXISTS checklist_items_materiel_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Re-add FK that allows null
ALTER TABLE checklist_items
  ALTER COLUMN materiel_id DROP NOT NULL;

ALTER TABLE checklist_items
  ADD CONSTRAINT checklist_items_materiel_id_fkey
  FOREIGN KEY (materiel_id) REFERENCES materiel(id) ON DELETE SET NULL;
