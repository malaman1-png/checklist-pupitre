-- Move editable admin password out of public settings into a private table.
-- This prevents leaking the secret through anon-readable settings.

CREATE TABLE IF NOT EXISTS admin_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_secrets_deny_all" ON admin_secrets;
CREATE POLICY "admin_secrets_deny_all"
ON admin_secrets
FOR ALL
USING (false)
WITH CHECK (false);

DO $$
DECLARE
  legacy_pw TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'settings'
      AND column_name = 'admin_password'
  ) THEN
    EXECUTE 'SELECT COALESCE(NULLIF(admin_password, ''''), ''pupitre2026'') FROM settings LIMIT 1'
      INTO legacy_pw;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_secrets LIMIT 1) THEN
    INSERT INTO admin_secrets (admin_password)
    VALUES (COALESCE(legacy_pw, 'pupitre2026'));
  END IF;
END $$;

ALTER TABLE settings DROP COLUMN IF EXISTS admin_password;
