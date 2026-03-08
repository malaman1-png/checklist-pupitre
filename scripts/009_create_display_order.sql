CREATE TABLE IF NOT EXISTS display_order (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE display_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "display_order_public" ON display_order FOR ALL USING (true) WITH CHECK (true);
