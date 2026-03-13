-- Add dedicated category order for Etincelle (independent from Pupitre)

ALTER TABLE types
ADD COLUMN IF NOT EXISTS etincelle_sort_order INT;

-- Initialize Etincelle order from current Pupitre order for existing rows.
UPDATE types
SET etincelle_sort_order = sort_order
WHERE etincelle_sort_order IS NULL;
