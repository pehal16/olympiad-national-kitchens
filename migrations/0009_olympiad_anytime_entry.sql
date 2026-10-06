-- Existing days keep their Moscow time window. An explicit anytime run has no
-- calendar date; its event_date is the unique storage key "anytime" and its
-- unused NOT NULL time columns are empty strings.
ALTER TABLE olympiad_story_runs ADD COLUMN entry_mode TEXT NOT NULL DEFAULT 'scheduled'
  CHECK (entry_mode IN ('scheduled', 'anytime'));
