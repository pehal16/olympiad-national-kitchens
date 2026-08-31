CREATE TABLE IF NOT EXISTS learning_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN (
      'not_started',
      'in_progress',
      'submitted',
      'under_review',
      'returned',
      'accepted',
      'overdue',
      'withdrawn'
    )),
  draft_revision INTEGER NOT NULL DEFAULT 0
    CHECK (draft_revision >= 0),
  current_revision_no INTEGER NOT NULL DEFAULT 0
    CHECK (current_revision_no >= 0),
  auto_score REAL
    CHECK (auto_score IS NULL OR auto_score >= 0),
  manual_score REAL
    CHECK (manual_score IS NULL OR manual_score >= 0),
  final_score REAL
    CHECK (final_score IS NULL OR final_score >= 0),
  grade TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  started_at TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  accepted_at TEXT,
  grade_published_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES learning_assignments (id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_submissions_assignment_status
  ON learning_submissions (assignment_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_learning_submissions_student_status
  ON learning_submissions (student_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS learning_draft_answers (
  submission_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  answer_json TEXT NOT NULL
    CHECK (json_valid(answer_json)),
  revision_no INTEGER NOT NULL DEFAULT 1
    CHECK (revision_no > 0),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (submission_id, block_id),
  FOREIGN KEY (submission_id) REFERENCES learning_submissions (id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES learning_work_blocks (id) ON DELETE RESTRICT,
  FOREIGN KEY (updated_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_draft_answers_updated
  ON learning_draft_answers (submission_id, updated_at);

CREATE TABLE IF NOT EXISTS learning_submission_revisions (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL
    CHECK (revision_no > 0),
  work_version_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'building'
    CHECK (state IN ('building', 'sealed')),
  submitted_by TEXT NOT NULL,
  auto_score REAL
    CHECK (auto_score IS NULL OR auto_score >= 0),
  max_score REAL NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  submitted_at TEXT NOT NULL,
  sealed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (submission_id, revision_no),
  CHECK (state <> 'sealed' OR sealed_at IS NOT NULL),
  FOREIGN KEY (submission_id) REFERENCES learning_submissions (id) ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id) REFERENCES learning_work_versions (id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_submission_revisions_submission
  ON learning_submission_revisions (submission_id, revision_no DESC, state);

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_attempt_limit_insert
BEFORE INSERT ON learning_submission_revisions
WHEN EXISTS (
  SELECT 1
  FROM learning_submissions AS submission
  INNER JOIN learning_assignments AS assignment
    ON assignment.id = submission.assignment_id
  WHERE submission.id = NEW.submission_id
    AND (
      SELECT COUNT(*)
      FROM learning_submission_revisions AS existing_revision
      WHERE existing_revision.submission_id = NEW.submission_id
    ) >= assignment.max_attempts
)
BEGIN
  SELECT RAISE(ABORT, 'learning max attempts exceeded');
END;

CREATE TABLE IF NOT EXISTS learning_revision_answers (
  revision_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  answer_json TEXT NOT NULL
    CHECK (json_valid(answer_json)),
  auto_score REAL
    CHECK (auto_score IS NULL OR auto_score >= 0),
  max_score REAL NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  feedback_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(feedback_json)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (revision_id, block_id),
  FOREIGN KEY (revision_id) REFERENCES learning_submission_revisions (id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES learning_work_blocks (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_revision_answers_block
  ON learning_revision_answers (block_id, revision_id);

CREATE TABLE IF NOT EXISTS learning_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'returned', 'accepted')),
  summary_comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (revision_id),
  CHECK (status = 'draft' OR completed_at IS NOT NULL),
  FOREIGN KEY (submission_id) REFERENCES learning_submissions (id) ON DELETE RESTRICT,
  FOREIGN KEY (revision_id) REFERENCES learning_submission_revisions (id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_reviews_queue
  ON learning_reviews (status, created_at, reviewer_id);

CREATE INDEX IF NOT EXISTS idx_learning_reviews_submission
  ON learning_reviews (submission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_rubric_scores (
  review_id TEXT NOT NULL,
  rubric_criterion_id TEXT NOT NULL,
  score REAL NOT NULL
    CHECK (score >= 0),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (review_id, rubric_criterion_id),
  FOREIGN KEY (review_id) REFERENCES learning_reviews (id) ON DELETE CASCADE,
  FOREIGN KEY (rubric_criterion_id) REFERENCES learning_rubric_criteria (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_rubric_scores_criterion
  ON learning_rubric_scores (rubric_criterion_id, review_id);

CREATE TABLE IF NOT EXISTS learning_grade_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  revision_id TEXT,
  review_id TEXT,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'auto_scored',
      'manual_scored',
      'returned',
      'accepted',
      'grade_published',
      'grade_changed'
    )),
  auto_score REAL
    CHECK (auto_score IS NULL OR auto_score >= 0),
  manual_score REAL
    CHECK (manual_score IS NULL OR manual_score >= 0),
  final_score REAL
    CHECK (final_score IS NULL OR final_score >= 0),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES learning_submissions (id) ON DELETE RESTRICT,
  FOREIGN KEY (revision_id) REFERENCES learning_submission_revisions (id) ON DELETE RESTRICT,
  FOREIGN KEY (review_id) REFERENCES learning_reviews (id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_grade_events_submission
  ON learning_grade_events (submission_id, created_at, id);

CREATE TABLE IF NOT EXISTS learning_attachments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  revision_id TEXT,
  block_id TEXT,
  uploaded_by TEXT NOT NULL,
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL
    CHECK (byte_size >= 0),
  sha256 TEXT NOT NULL,
  storage_backend TEXT NOT NULL
    CHECK (storage_backend IN ('r2', 'file')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'rejected', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (object_key),
  FOREIGN KEY (submission_id) REFERENCES learning_submissions (id) ON DELETE RESTRICT,
  FOREIGN KEY (revision_id) REFERENCES learning_submission_revisions (id) ON DELETE RESTRICT,
  FOREIGN KEY (block_id) REFERENCES learning_work_blocks (id) ON DELETE RESTRICT,
  FOREIGN KEY (uploaded_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_attachments_submission_status
  ON learning_attachments (submission_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_learning_attachments_revision
  ON learning_attachments (revision_id, block_id);

CREATE TABLE IF NOT EXISTS learning_audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_audit_events_entity
  ON learning_audit_events (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_audit_events_actor
  ON learning_audit_events (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_id TEXT,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  response_status INTEGER,
  response_json TEXT
    CHECK (response_json IS NULL OR json_valid(response_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (scope, actor_id, idempotency_key),
  FOREIGN KEY (actor_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_idempotency_keys_expiry
  ON learning_idempotency_keys (expires_at, status);

CREATE TABLE IF NOT EXISTS learning_lesson_journal (
  id TEXT PRIMARY KEY,
  lesson_date TEXT NOT NULL,
  group_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  topic_id TEXT,
  schedule_source TEXT NOT NULL DEFAULT '',
  replacement_checked INTEGER NOT NULL DEFAULT 0
    CHECK (replacement_checked IN (0, 1)),
  lesson_number INTEGER NOT NULL
    CHECK (lesson_number > 0),
  activity_kind TEXT NOT NULL
    CHECK (activity_kind IN ('lecture', 'homework', 'practice', 'lab', 'test', 'independent')),
  planned_hours INTEGER
    CHECK (planned_hours IS NULL OR planned_hours > 0),
  scheduled_pairs INTEGER
    CHECK (scheduled_pairs IS NULL OR scheduled_pairs > 0),
  hours_mismatch INTEGER NOT NULL DEFAULT 0
    CHECK (hours_mismatch IN (0, 1)),
  source_files_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(source_files_json)),
  output_file TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (review_status IN (
      'planned',
      'preparing',
      'review_required',
      'approved',
      'sent',
      'blocked_by_hours_mismatch'
    )),
  delivery_status TEXT NOT NULL DEFAULT 'not_prepared'
    CHECK (delivery_status IN ('not_prepared', 'pending_approval', 'approved', 'sent', 'failed')),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (lesson_date, group_id, course_id, lesson_number),
  FOREIGN KEY (group_id) REFERENCES learning_groups (id) ON DELETE RESTRICT,
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id) REFERENCES learning_topics (id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_lesson_journal_group_date
  ON learning_lesson_journal (group_id, lesson_date DESC, course_id);

CREATE INDEX IF NOT EXISTS idx_learning_lesson_journal_course_status
  ON learning_lesson_journal (course_id, review_status, lesson_date);

CREATE TABLE IF NOT EXISTS learning_delivery_outbox (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  created_by TEXT NOT NULL,
  channel TEXT NOT NULL
    CHECK (channel IN ('email', 'other')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'sent', 'failed', 'cancelled')),
  payload_json TEXT NOT NULL
    CHECK (json_valid(payload_json)),
  approved_at TEXT,
  sent_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (idempotency_key),
  FOREIGN KEY (created_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_delivery_outbox_status
  ON learning_delivery_outbox (status, created_at);

CREATE TRIGGER IF NOT EXISTS trg_learning_draft_answers_match_assignment_insert
BEFORE INSERT ON learning_draft_answers
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submissions AS submission
  INNER JOIN learning_assignments AS assignment
    ON assignment.id = submission.assignment_id
  INNER JOIN learning_work_blocks AS block
    ON block.version_id = assignment.work_version_id
  WHERE submission.id = NEW.submission_id
    AND block.id = NEW.block_id
)
BEGIN
  SELECT RAISE(ABORT, 'draft answers must reference a block from the assigned work version');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_draft_answers_match_assignment_update
BEFORE UPDATE OF submission_id, block_id ON learning_draft_answers
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submissions AS submission
  INNER JOIN learning_assignments AS assignment
    ON assignment.id = submission.assignment_id
  INNER JOIN learning_work_blocks AS block
    ON block.version_id = assignment.work_version_id
  WHERE submission.id = NEW.submission_id
    AND block.id = NEW.block_id
)
BEGIN
  SELECT RAISE(ABORT, 'draft answers must reference a block from the assigned work version');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_require_building_insert
BEFORE INSERT ON learning_submission_revisions
WHEN NEW.state <> 'building'
BEGIN
  SELECT RAISE(ABORT, 'submission revisions must be created in building state');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_match_assignment_insert
BEFORE INSERT ON learning_submission_revisions
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submissions AS submission
  INNER JOIN learning_assignments AS assignment
    ON assignment.id = submission.assignment_id
  WHERE submission.id = NEW.submission_id
    AND assignment.work_version_id = NEW.work_version_id
)
BEGIN
  SELECT RAISE(ABORT, 'submission revision must use the assigned work version');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_match_assignment_update
BEFORE UPDATE OF submission_id, work_version_id ON learning_submission_revisions
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submissions AS submission
  INNER JOIN learning_assignments AS assignment
    ON assignment.id = submission.assignment_id
  WHERE submission.id = NEW.submission_id
    AND assignment.work_version_id = NEW.work_version_id
)
BEGIN
  SELECT RAISE(ABORT, 'submission revision must use the assigned work version');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_immutable_update
BEFORE UPDATE ON learning_submission_revisions
WHEN OLD.state = 'sealed'
BEGIN
  SELECT RAISE(ABORT, 'sealed submission revisions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_submission_revisions_immutable_delete
BEFORE DELETE ON learning_submission_revisions
WHEN OLD.state = 'sealed'
BEGIN
  SELECT RAISE(ABORT, 'sealed submission revisions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_revision_answers_mutable_insert
BEFORE INSERT ON learning_revision_answers
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submission_revisions AS revision
  INNER JOIN learning_work_blocks AS block
    ON block.version_id = revision.work_version_id
  WHERE revision.id = NEW.revision_id
    AND revision.state = 'building'
    AND block.id = NEW.block_id
)
BEGIN
  SELECT RAISE(ABORT, 'revision answers require a building revision and matching work block');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_revision_answers_mutable_update
BEFORE UPDATE ON learning_revision_answers
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submission_revisions AS revision
  INNER JOIN learning_work_blocks AS block
    ON block.version_id = revision.work_version_id
  WHERE revision.id = OLD.revision_id
    AND revision.state = 'building'
    AND block.id = OLD.block_id
) OR NOT EXISTS (
  SELECT 1
  FROM learning_submission_revisions AS revision
  INNER JOIN learning_work_blocks AS block
    ON block.version_id = revision.work_version_id
  WHERE revision.id = NEW.revision_id
    AND revision.state = 'building'
    AND block.id = NEW.block_id
)
BEGIN
  SELECT RAISE(ABORT, 'answers of sealed submission revisions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_revision_answers_mutable_delete
BEFORE DELETE ON learning_revision_answers
WHEN COALESCE((
  SELECT state FROM learning_submission_revisions WHERE id = OLD.revision_id
), 'missing') <> 'building'
BEGIN
  SELECT RAISE(ABORT, 'answers of sealed submission revisions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_reviews_match_revision_insert
BEFORE INSERT ON learning_reviews
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submission_revisions
  WHERE id = NEW.revision_id
    AND submission_id = NEW.submission_id
    AND state = 'sealed'
)
BEGIN
  SELECT RAISE(ABORT, 'reviews require a sealed revision from the same submission');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_reviews_match_revision_update
BEFORE UPDATE OF submission_id, revision_id ON learning_reviews
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_submission_revisions
  WHERE id = NEW.revision_id
    AND submission_id = NEW.submission_id
    AND state = 'sealed'
)
BEGIN
  SELECT RAISE(ABORT, 'reviews require a sealed revision from the same submission');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_reviews_immutable_update
BEFORE UPDATE ON learning_reviews
WHEN OLD.status IN ('returned', 'accepted')
BEGIN
  SELECT RAISE(ABORT, 'completed learning reviews are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_reviews_immutable_delete
BEFORE DELETE ON learning_reviews
WHEN OLD.status IN ('returned', 'accepted')
BEGIN
  SELECT RAISE(ABORT, 'completed learning reviews are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_scores_mutable_insert
BEFORE INSERT ON learning_rubric_scores
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_reviews AS review
  INNER JOIN learning_submission_revisions AS revision
    ON revision.id = review.revision_id
  INNER JOIN learning_rubric_criteria AS criterion
    ON criterion.version_id = revision.work_version_id
  WHERE review.id = NEW.review_id
    AND review.status = 'draft'
    AND criterion.id = NEW.rubric_criterion_id
)
BEGIN
  SELECT RAISE(ABORT, 'rubric scores require a draft review and matching work criterion');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_scores_mutable_update
BEFORE UPDATE ON learning_rubric_scores
WHEN COALESCE((
  SELECT status FROM learning_reviews WHERE id = OLD.review_id
), 'missing') <> 'draft'
  OR COALESCE((
    SELECT status FROM learning_reviews WHERE id = NEW.review_id
  ), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'rubric scores of completed reviews are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_scores_mutable_delete
BEFORE DELETE ON learning_rubric_scores
WHEN COALESCE((
  SELECT status FROM learning_reviews WHERE id = OLD.review_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'rubric scores of completed reviews are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_attachments_match_revision_insert
BEFORE INSERT ON learning_attachments
WHEN NEW.revision_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM learning_submission_revisions
    WHERE id = NEW.revision_id
      AND submission_id = NEW.submission_id
  )
BEGIN
  SELECT RAISE(ABORT, 'attachment revision must belong to the same submission');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_attachments_match_revision_update
BEFORE UPDATE OF submission_id, revision_id ON learning_attachments
WHEN NEW.revision_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM learning_submission_revisions
    WHERE id = NEW.revision_id
      AND submission_id = NEW.submission_id
  )
BEGIN
  SELECT RAISE(ABORT, 'attachment revision must belong to the same submission');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_revision_file_evidence_guard
BEFORE UPDATE OF state ON learning_submission_revisions
WHEN NEW.state = 'sealed'
  AND OLD.state = 'building'
  AND (
    EXISTS (
      SELECT 1
      FROM learning_revision_answers AS answer
      INNER JOIN learning_work_blocks AS block
        ON block.version_id = NEW.work_version_id
       AND block.id = answer.block_id
      INNER JOIN json_each(answer.answer_json, '$.files') AS file
      LEFT JOIN learning_attachments AS attachment
        ON attachment.id = CAST(json_extract(file.value, '$.id') AS TEXT)
      WHERE answer.revision_id = NEW.id
        AND block.block_type = 'file_evidence'
        AND (
          attachment.id IS NULL
          OR attachment.status <> 'ready'
          OR attachment.deleted_at IS NOT NULL
          OR attachment.submission_id <> NEW.submission_id
          OR attachment.uploaded_by <> NEW.submitted_by
          OR COALESCE(attachment.block_id, '') <> answer.block_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM learning_revision_answers AS answer
      INNER JOIN learning_work_blocks AS block
        ON block.version_id = NEW.work_version_id
       AND block.id = answer.block_id
      INNER JOIN json_each(answer.answer_json, '$.files') AS file
      WHERE answer.revision_id = NEW.id
        AND block.block_type = 'file_evidence'
      GROUP BY answer.block_id, CAST(json_extract(file.value, '$.id') AS TEXT)
      HAVING COUNT(*) > 1
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'learning attachment integrity violation');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_grade_events_append_only_update
BEFORE UPDATE ON learning_grade_events
BEGIN
  SELECT RAISE(ABORT, 'learning grade events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_grade_events_append_only_delete
BEFORE DELETE ON learning_grade_events
BEGIN
  SELECT RAISE(ABORT, 'learning grade events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_audit_events_append_only_update
BEFORE UPDATE ON learning_audit_events
BEGIN
  SELECT RAISE(ABORT, 'learning audit events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_audit_events_append_only_delete
BEFORE DELETE ON learning_audit_events
BEGIN
  SELECT RAISE(ABORT, 'learning audit events are append-only');
END;
