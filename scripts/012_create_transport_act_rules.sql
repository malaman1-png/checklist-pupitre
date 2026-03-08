-- Transport rules per act (applied only when transport_mode = 'train_mono')

CREATE TABLE IF NOT EXISTS transport_act_exclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  act_type TEXT NOT NULL CHECK (act_type IN ('fixed', 'modular')),
  act_id UUID NOT NULL,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_act_replacements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  act_type TEXT NOT NULL CHECK (act_type IN ('fixed', 'modular')),
  act_id UUID NOT NULL,
  from_materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  to_materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_act_additions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  act_type TEXT NOT NULL CHECK (act_type IN ('fixed', 'modular')),
  act_id UUID NOT NULL,
  materiel_id UUID NOT NULL REFERENCES materiel(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transport_act_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_act_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_act_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON transport_act_exclusions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transport_act_replacements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_access" ON transport_act_additions FOR ALL USING (true) WITH CHECK (true);
