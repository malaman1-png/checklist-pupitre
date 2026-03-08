CREATE TABLE IF NOT EXISTS always_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE always_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "always_items_public_select" ON always_items FOR SELECT USING (true);
CREATE POLICY "always_items_public_insert" ON always_items FOR INSERT WITH CHECK (true);
CREATE POLICY "always_items_public_update" ON always_items FOR UPDATE USING (true);
CREATE POLICY "always_items_public_delete" ON always_items FOR DELETE USING (true);
