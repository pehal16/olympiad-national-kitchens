CREATE TABLE IF NOT EXISTS learning_work_templates (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  topic_id TEXT,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  activity_kind TEXT NOT NULL
    CHECK (activity_kind IN ('homework', 'practice', 'lab', 'test', 'independent')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT,
  FOREIGN KEY (topic_id) REFERENCES learning_topics (id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_work_templates_course_status
  ON learning_work_templates (course_id, status, activity_kind);

CREATE INDEX IF NOT EXISTS idx_learning_work_templates_topic
  ON learning_work_templates (topic_id, status);

CREATE TABLE IF NOT EXISTS learning_work_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  version_no INTEGER NOT NULL
    CHECK (version_no > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  schema_version INTEGER NOT NULL DEFAULT 1
    CHECK (schema_version > 0),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '{"schemaVersion":1,"blocks":[]}'
    CHECK (json_valid(content_json)),
  public_rubric_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(public_rubric_json)),
  private_key_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(private_key_json)),
  max_score REAL NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (template_id, version_no),
  CHECK (status <> 'published' OR published_at IS NOT NULL),
  FOREIGN KEY (template_id) REFERENCES learning_work_templates (id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_work_versions_single_draft
  ON learning_work_versions (template_id)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_learning_work_versions_template_status
  ON learning_work_versions (template_id, status, version_no DESC);

CREATE TABLE IF NOT EXISTS learning_work_blocks (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  position INTEGER NOT NULL
    CHECK (position >= 0),
  block_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  required INTEGER NOT NULL DEFAULT 0
    CHECK (required IN (0, 1)),
  max_score REAL NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (version_id, position),
  UNIQUE (id, version_id),
  FOREIGN KEY (version_id) REFERENCES learning_work_versions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_work_blocks_version_position
  ON learning_work_blocks (version_id, position);

CREATE TABLE IF NOT EXISTS learning_work_keys (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  key_json TEXT NOT NULL
    CHECK (json_valid(key_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (version_id, block_id),
  FOREIGN KEY (block_id, version_id)
    REFERENCES learning_work_blocks (id, version_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_work_keys_version
  ON learning_work_keys (version_id, block_id);

CREATE TABLE IF NOT EXISTS learning_rubric_criteria (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  position INTEGER NOT NULL
    CHECK (position >= 0),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  max_score REAL NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (version_id, position),
  FOREIGN KEY (version_id) REFERENCES learning_work_versions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_rubric_criteria_version
  ON learning_rubric_criteria (version_id, position);

CREATE TABLE IF NOT EXISTS learning_assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  work_version_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  available_from TEXT,
  due_at TEXT,
  allow_late INTEGER NOT NULL DEFAULT 0
    CHECK (allow_late IN (0, 1)),
  max_attempts INTEGER NOT NULL DEFAULT 1
    CHECK (max_attempts > 0),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  closed_at TEXT,
  CHECK (status <> 'published' OR published_at IS NOT NULL),
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT,
  FOREIGN KEY (work_version_id) REFERENCES learning_work_versions (id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_assignments_course_status_due
  ON learning_assignments (course_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_learning_assignments_version
  ON learning_assignments (work_version_id, status);

CREATE TABLE IF NOT EXISTS learning_assignment_groups (
  assignment_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (assignment_id, group_id),
  FOREIGN KEY (assignment_id) REFERENCES learning_assignments (id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES learning_groups (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_groups_group
  ON learning_assignment_groups (group_id, assignment_id);

CREATE TABLE IF NOT EXISTS learning_assignment_recipients (
  assignment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source_group_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exempt', 'withdrawn')),
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (assignment_id, user_id),
  FOREIGN KEY (assignment_id) REFERENCES learning_assignments (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE RESTRICT,
  FOREIGN KEY (source_group_id) REFERENCES learning_groups (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_assignment_recipients_user_status
  ON learning_assignment_recipients (user_id, status, assignment_id);

CREATE TRIGGER IF NOT EXISTS trg_learning_work_versions_require_draft_insert
BEFORE INSERT ON learning_work_versions
WHEN NEW.status <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'learning work versions must be created as drafts');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_versions_publish_requires_block
BEFORE UPDATE OF status ON learning_work_versions
WHEN NEW.status = 'published'
  AND OLD.status = 'draft'
  AND NOT EXISTS (
    SELECT 1
    FROM learning_work_blocks
    WHERE version_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'published learning work versions require at least one block');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_versions_immutable_update
BEFORE UPDATE ON learning_work_versions
WHEN OLD.status = 'published'
BEGIN
  SELECT RAISE(ABORT, 'published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_versions_immutable_delete
BEFORE DELETE ON learning_work_versions
WHEN OLD.status = 'published'
BEGIN
  SELECT RAISE(ABORT, 'published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_blocks_mutable_insert
BEFORE INSERT ON learning_work_blocks
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = NEW.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'blocks can only be added to draft learning work versions');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_blocks_mutable_update
BEFORE UPDATE ON learning_work_blocks
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
  OR COALESCE((
    SELECT status FROM learning_work_versions WHERE id = NEW.version_id
  ), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'blocks of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_blocks_mutable_delete
BEFORE DELETE ON learning_work_blocks
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'blocks of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_keys_mutable_insert
BEFORE INSERT ON learning_work_keys
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = NEW.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'keys can only be added to draft learning work versions');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_keys_mutable_update
BEFORE UPDATE ON learning_work_keys
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
  OR COALESCE((
    SELECT status FROM learning_work_versions WHERE id = NEW.version_id
  ), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'keys of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_work_keys_mutable_delete
BEFORE DELETE ON learning_work_keys
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'keys of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_criteria_mutable_insert
BEFORE INSERT ON learning_rubric_criteria
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = NEW.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'rubric criteria can only be added to draft learning work versions');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_criteria_mutable_update
BEFORE UPDATE ON learning_rubric_criteria
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
  OR COALESCE((
    SELECT status FROM learning_work_versions WHERE id = NEW.version_id
  ), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'rubrics of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_rubric_criteria_mutable_delete
BEFORE DELETE ON learning_rubric_criteria
WHEN COALESCE((
  SELECT status FROM learning_work_versions WHERE id = OLD.version_id
), 'missing') <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'rubrics of published learning work versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_assignments_require_published_version_insert
BEFORE INSERT ON learning_assignments
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_work_versions AS version
  INNER JOIN learning_work_templates AS template
    ON template.id = version.template_id
  WHERE version.id = NEW.work_version_id
    AND version.status = 'published'
    AND template.course_id = NEW.course_id
)
BEGIN
  SELECT RAISE(ABORT, 'assignments require a published version from the same course');
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_assignments_require_published_version_update
BEFORE UPDATE OF work_version_id, course_id ON learning_assignments
WHEN NOT EXISTS (
  SELECT 1
  FROM learning_work_versions AS version
  INNER JOIN learning_work_templates AS template
    ON template.id = version.template_id
  WHERE version.id = NEW.work_version_id
    AND version.status = 'published'
    AND template.course_id = NEW.course_id
)
BEGIN
  SELECT RAISE(ABORT, 'assignments require a published version from the same course');
END;
