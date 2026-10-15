-- Authorized one-time operational schedule. Preserve announced times, run
-- identity, all attempts, answers and credentials. Never reopen published runs.
UPDATE olympiad_story_runs
SET entry_mode='scheduled', stopped=0,
    payload_json=json_set(payload_json,
      '$.entryMode','scheduled', '$.fixedAdmission',json('true'),
      '$.entryGraceMinutes',120, '$.admissionMode','auto', '$.stopped',json('false'))
WHERE id='official-2026-10-16' AND event_date='2026-10-16'
  AND entry_starts_at='2026-10-16T05:00:00.000Z'
  AND entry_ends_at='2026-10-16T13:00:00.000Z'
  AND published_at IS NULL;

INSERT INTO olympiad_control(id,run_id)
SELECT 'current',id FROM olympiad_story_runs
WHERE id='official-2026-10-16' AND event_date='2026-10-16'
  AND entry_starts_at='2026-10-16T05:00:00.000Z'
  AND entry_ends_at='2026-10-16T13:00:00.000Z'
  AND published_at IS NULL
ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id;
