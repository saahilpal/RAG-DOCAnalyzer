BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE users
SET provider = COALESCE(provider, 'google'),
    provider_id = COALESCE(provider_id, google_id)
WHERE google_id IS NOT NULL
  AND (provider IS NULL OR provider_id IS NULL);

DROP INDEX IF EXISTS idx_users_google_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
  ON users(provider, provider_id)
  WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_provider
  ON users(provider)
  WHERE provider IS NOT NULL;

DROP TABLE IF EXISTS otp_codes;

ALTER TABLE users DROP COLUMN IF EXISTS google_id;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;

COMMIT;
