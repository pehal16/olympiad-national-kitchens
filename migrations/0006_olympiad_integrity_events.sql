CREATE TABLE IF NOT EXISTS olympiad_attempt_events (
  attempt_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (attempt_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_olympiad_attempt_events_attempt_time
  ON olympiad_attempt_events (attempt_id, received_at);
