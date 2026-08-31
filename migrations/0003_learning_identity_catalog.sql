CREATE TABLE IF NOT EXISTS learning_users (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_users_login
  ON learning_users (login COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_learning_users_status
  ON learning_users (status, display_name);

CREATE TABLE IF NOT EXISTS learning_credentials (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL
    CHECK (password_iterations > 0),
  must_change_password INTEGER NOT NULL DEFAULT 1
    CHECK (must_change_password IN (0, 1)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('admin', 'teacher', 'student')),
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_user_roles_role
  ON learning_user_roles (role, user_id);

CREATE TABLE IF NOT EXISTS learning_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_sessions_csrf_token
  ON learning_sessions (csrf_token);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_user
  ON learning_sessions (user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_expiry
  ON learning_sessions (expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS learning_login_limits (
  login_key TEXT PRIMARY KEY COLLATE NOCASE,
  failure_count INTEGER NOT NULL DEFAULT 0
    CHECK (failure_count >= 0),
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_login_limits_locked_until
  ON learning_login_limits (locked_until);

CREATE TABLE IF NOT EXISTS learning_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_groups_code
  ON learning_groups (code COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_learning_groups_status
  ON learning_groups (status, name);

CREATE TABLE IF NOT EXISTS learning_memberships (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'left')),
  joined_at TEXT NOT NULL,
  left_at TEXT,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES learning_groups (id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_memberships_user_status
  ON learning_memberships (user_id, status, group_id);

CREATE INDEX IF NOT EXISTS idx_learning_memberships_group_status
  ON learning_memberships (group_id, status, user_id);

CREATE TABLE IF NOT EXISTS learning_subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_subjects_code
  ON learning_subjects (code COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_learning_subjects_status
  ON learning_subjects (status, name);

CREATE TABLE IF NOT EXISTS learning_courses (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES learning_subjects (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_courses_subject_year
  ON learning_courses (subject_id, academic_year, status);

CREATE TABLE IF NOT EXISTS learning_course_groups (
  course_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (course_id, group_id),
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT,
  FOREIGN KEY (group_id) REFERENCES learning_groups (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_course_groups_group
  ON learning_course_groups (group_id, status, course_id);

CREATE TABLE IF NOT EXISTS learning_course_teachers (
  course_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (course_id, user_id),
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES learning_users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_course_teachers_user
  ON learning_course_teachers (user_id, status, course_id);

CREATE TABLE IF NOT EXISTS learning_topics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  sequence_no INTEGER NOT NULL
    CHECK (sequence_no > 0),
  title TEXT NOT NULL,
  activity_kind TEXT NOT NULL DEFAULT 'lecture'
    CHECK (activity_kind IN ('lecture', 'homework', 'practice', 'lab', 'test', 'independent')),
  planned_hours INTEGER
    CHECK (planned_hours IS NULL OR planned_hours > 0),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  config_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(config_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (course_id, sequence_no),
  FOREIGN KEY (course_id) REFERENCES learning_courses (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_learning_topics_course_status
  ON learning_topics (course_id, status, sequence_no);
