-- Transport global rules tables
CREATE TABLE IF NOT EXISTS transport_global_exclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'train_mono',
  materiel_id UUID REFERENCES materiel(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_global_replacements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'train_mono',
  from_materiel_id UUID REFERENCES materiel(id) ON DELETE CASCADE,
  to_materiel_id UUID REFERENCES materiel(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_global_additions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'train_mono',
  materiel_id UUID REFERENCES materiel(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE transport_global_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_global_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_global_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON transport_global_exclusions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transport_global_replacements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transport_global_additions FOR ALL USING (true) WITH CHECK (true);
