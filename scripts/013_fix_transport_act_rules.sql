-- Fix act_type CHECK constraint to allow 'system' for SON/LIGHT
-- Fix act_id type from UUID to TEXT to allow "son"/"light" as values

-- Drop old constraints and change column types
ALTER TABLE transport_act_exclusions
  DROP CONSTRAINT IF EXISTS transport_act_exclusions_act_type_check,
  ALTER COLUMN act_id TYPE TEXT USING act_id::TEXT;
ALTER TABLE transport_act_exclusions
  ADD CONSTRAINT transport_act_exclusions_act_type_check CHECK (act_type IN ('system', 'fixed', 'modular'));

ALTER TABLE transport_act_replacements
  DROP CONSTRAINT IF EXISTS transport_act_replacements_act_type_check,
  ALTER COLUMN act_id TYPE TEXT USING act_id::TEXT;
ALTER TABLE transport_act_replacements
  ADD CONSTRAINT transport_act_replacements_act_type_check CHECK (act_type IN ('system', 'fixed', 'modular'));

ALTER TABLE transport_act_additions
  DROP CONSTRAINT IF EXISTS transport_act_additions_act_type_check,
  ALTER COLUMN act_id TYPE TEXT USING act_id::TEXT;
ALTER TABLE transport_act_additions
  ADD CONSTRAINT transport_act_additions_act_type_check CHECK (act_type IN ('system', 'fixed', 'modular'));
