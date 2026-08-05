PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  auth_user_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'club_manager', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  last_active_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  field TEXT,
  club_type TEXT,
  description TEXT NOT NULL,
  activity_details TEXT NOT NULL,
  teacher_display_text TEXT,
  contact_location TEXT,
  activity_location TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  recruitment_status TEXT NOT NULL DEFAULT 'open',
  application_start_at INTEGER,
  application_end_at INTEGER,
  manager_user_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (manager_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teacher_clubs (
  id TEXT PRIMARY KEY NOT NULL,
  teacher_user_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (teacher_user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL,
  application_number TEXT NOT NULL,
  user_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'waiting', 'approved', 'rejected', 'cancelled')),
  motivation TEXT NOT NULL,
  interest_area TEXT,
  career_interest TEXT NOT NULL,
  experience TEXT NOT NULL,
  additional_answer TEXT,
  submitted_at INTEGER NOT NULL,
  cancelled_at INTEGER,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  review_comment TEXT,
  google_sheet_synced INTEGER NOT NULL DEFAULT 0,
  google_sheet_synced_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  author_user_id TEXT NOT NULL,
  author_alias TEXT NOT NULL,
  category TEXT NOT NULL,
  club_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_notice INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  author_alias TEXT NOT NULL,
  content TEXT NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  author_user_id TEXT NOT NULL,
  author_alias TEXT NOT NULL,
  club_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'answered', 'closed')),
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_data TEXT,
  after_data TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  data_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- These zero-row reads are compatibility guards. If a table already exists but
-- lacks a required column, Sites review/application must stop instead of guessing
-- an ALTER TABLE migration.
SELECT id, auth_user_id, alias, recovery_hash, role, is_active, last_active_at, created_at, updated_at FROM users LIMIT 0;
SELECT id, name, category, field, club_type, description, activity_details, teacher_display_text, contact_location, activity_location, capacity, recruitment_status, application_start_at, application_end_at, manager_user_id, is_active, created_at, updated_at FROM clubs LIMIT 0;
SELECT id, teacher_user_id, club_id, created_at, created_by FROM teacher_clubs LIMIT 0;
SELECT id, application_number, user_id, club_id, status, motivation, interest_area, career_interest, experience, additional_answer, submitted_at, cancelled_at, reviewed_at, reviewed_by, review_comment, google_sheet_synced, google_sheet_synced_at, updated_at FROM applications LIMIT 0;
SELECT id, author_user_id, author_alias, category, club_id, title, content, is_notice, is_hidden, deleted_at, created_at, updated_at FROM posts LIMIT 0;
SELECT id, post_id, author_user_id, author_alias, content, is_hidden, deleted_at, created_at, updated_at FROM post_comments LIMIT 0;
SELECT id, author_user_id, author_alias, club_id, title, content, is_private, status, deleted_at, created_at, updated_at FROM questions LIMIT 0;
SELECT id, question_id, author_user_id, author_role, content, deleted_at, created_at, updated_at FROM answers LIMIT 0;
SELECT id, actor_user_id, actor_role, action_type, target_type, target_id, before_data, after_data, created_at FROM audit_logs LIMIT 0;
SELECT id, data_type, source_id, operation, payload, status, retry_count, last_error, resolved_at, created_at, updated_at FROM sync_jobs LIMIT 0;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique ON users (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_alias_unique ON users (alias);
CREATE UNIQUE INDEX IF NOT EXISTS users_recovery_hash_unique ON users (recovery_hash);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_clubs_teacher_club_unique ON teacher_clubs (teacher_user_id, club_id);
CREATE UNIQUE INDEX IF NOT EXISTS applications_application_number_unique ON applications (application_number);
CREATE UNIQUE INDEX IF NOT EXISTS application_user_club_unique ON applications (user_id, club_id);
CREATE UNIQUE INDEX IF NOT EXISTS sync_source_operation_unique ON sync_jobs (data_type, source_id, operation);
CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id);
CREATE INDEX IF NOT EXISTS applications_club_idx ON applications (club_id);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at);
CREATE INDEX IF NOT EXISTS questions_club_idx ON questions (club_id);
