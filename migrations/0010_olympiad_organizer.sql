-- Operational controls and expected/registered participants; existing attempts
-- and immutable variants are retained.
CREATE TABLE IF NOT EXISTS olympiad_control (
  id TEXT PRIMARY KEY CHECK(id='current'),
  run_id TEXT NOT NULL REFERENCES olympiad_story_runs(id)
);
CREATE TABLE IF NOT EXISTS olympiad_registrations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  participant_signature TEXT NOT NULL,
  participant_json TEXT NOT NULL,
  expected INTEGER NOT NULL DEFAULT 0,
  registered_at TEXT,
  mentor_override TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id,participant_signature)
);
CREATE INDEX IF NOT EXISTS idx_olympiad_registrations_run ON olympiad_registrations(run_id,id);
