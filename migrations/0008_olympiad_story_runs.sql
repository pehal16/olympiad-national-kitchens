CREATE TABLE IF NOT EXISTS olympiad_story_runs (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL UNIQUE,
  entry_starts_at TEXT NOT NULL,
  entry_ends_at TEXT NOT NULL,
  published_at TEXT,
  stopped INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);
ALTER TABLE attempts ADD COLUMN story_run_id TEXT REFERENCES olympiad_story_runs(id);
CREATE INDEX IF NOT EXISTS idx_attempts_story_run ON attempts(story_run_id);
