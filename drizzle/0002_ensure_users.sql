CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  auth_user_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'club_manager', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique ON users (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_alias_unique ON users (alias);
CREATE UNIQUE INDEX IF NOT EXISTS users_recovery_hash_unique ON users (recovery_hash);
