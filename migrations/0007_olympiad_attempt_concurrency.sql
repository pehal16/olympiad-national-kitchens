ALTER TABLE attempts
  ADD COLUMN state_revision INTEGER NOT NULL DEFAULT 0;

ALTER TABLE attempts
  ADD COLUMN access_token_hash TEXT;
