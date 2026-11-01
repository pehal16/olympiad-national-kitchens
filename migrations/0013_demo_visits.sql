-- Activated on the isolated demo D1, never on the archived production binding.
CREATE TABLE IF NOT EXISTS demo_visit_summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_browsers INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO demo_visit_summary (id, started_at)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE TABLE IF NOT EXISTS demo_page_views (
  view_id TEXT PRIMARY KEY CHECK (length(view_id) = 32),
  visitor_hash TEXT NOT NULL CHECK (length(visitor_hash) = 64),
  persistent INTEGER NOT NULL CHECK (persistent IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_views_visitor ON demo_page_views(visitor_hash, persistent);
CREATE INDEX IF NOT EXISTS demo_attempts_started ON attempts(json_extract(payload_json,'$.startedAt'))
  WHERE json_extract(payload_json,'$.demonstration') = 1;

CREATE TRIGGER IF NOT EXISTS demo_view_count AFTER INSERT ON demo_page_views BEGIN
  UPDATE demo_visit_summary SET page_views = page_views + 1,
    unique_browsers = unique_browsers + CASE WHEN NEW.persistent = 1 AND NOT EXISTS (
      SELECT 1 FROM demo_page_views
      WHERE visitor_hash = NEW.visitor_hash AND persistent = 1 AND view_id != NEW.view_id
    ) THEN 1 ELSE 0 END WHERE id = 1;
END;
