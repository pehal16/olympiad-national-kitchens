-- Add only an index; issued variants, answers, owners and clocks stay intact.
CREATE INDEX IF NOT EXISTS idx_attempts_story_participant
ON attempts(story_run_id, json_extract(payload_json,'$.participantSignature'),
  CAST(COALESCE(json_extract(payload_json,'$.attemptNumber'),1) AS INTEGER) DESC, id DESC);
