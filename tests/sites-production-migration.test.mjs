import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migrationUrl = new URL("drizzle/sites-production/0000_production_schema.sql", root);
const requiredTables = ["users", "clubs", "teacher_clubs", "applications", "posts", "post_comments", "questions", "answers", "audit_logs", "sync_jobs"];

function openMigratedDatabase(sql) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(sql);
  return db;
}

test("Sites production migration is non-destructive and creates the complete schema", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const executableSql = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(executableSql, /\b(?:DROP|DELETE)\b/i);
  assert.doesNotMatch(executableSql, /ALTER\s+TABLE/i);
  const db = openMigratedDatabase(sql);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(({ name }) => name);
  for (const table of requiredTables) assert.ok(tables.includes(table), `missing table: ${table}`);

  const expectedColumns = {
    users: ["id", "auth_user_id", "alias", "recovery_hash", "role", "is_active", "last_active_at", "created_at", "updated_at"],
    applications: ["id", "application_number", "user_id", "club_id", "status", "motivation", "interest_area", "career_interest", "experience", "additional_answer", "submitted_at", "cancelled_at", "reviewed_at", "reviewed_by", "review_comment", "google_sheet_synced", "google_sheet_synced_at", "updated_at"],
    teacher_clubs: ["id", "teacher_user_id", "club_id", "created_at", "created_by"],
  };
  for (const [table, expected] of Object.entries(expectedColumns)) {
    const actual = db.prepare(`PRAGMA table_info(${table})`).all().map(({ name }) => name);
    assert.deepEqual(actual, expected);
  }

  const foreignKeyCount = requiredTables.reduce((count, table) => count + db.prepare(`PRAGMA foreign_key_list(${table})`).all().length, 0);
  assert.equal(foreignKeyCount, 12);
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(({ name }) => name);
  for (const name of ["users_auth_user_id_unique", "users_alias_unique", "users_recovery_hash_unique", "teacher_clubs_teacher_club_unique", "applications_application_number_unique", "application_user_club_unique", "sync_source_operation_unique"]) assert.ok(indexes.includes(name), `missing index: ${name}`);
  db.close();
});

test("production schema supports auth, application, review, teacher, board, and Q&A flows and preserves data on reapply", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const db = openMigratedDatabase(sql);
  const now = 1_786_000_000;
  const addUser = db.prepare("INSERT INTO users (id, auth_user_id, alias, recovery_hash, role, is_active, last_active_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)");
  addUser.run("student", "google-student", "student-alias", "student-hash", "student", now, now, now);
  addUser.run("admin", "google-admin", "admin-alias", "admin-hash", "admin", now, now, now);
  addUser.run("teacher", "google-teacher", "teacher-alias", "teacher-hash", "club_manager", now, now, now);
  db.prepare("INSERT INTO clubs (id, name, category, description, activity_details, created_at, updated_at) VALUES ('club', 'Club', 'science', 'Description', 'Activities', ?, ?)").run(now, now);
  db.prepare("INSERT INTO applications (id, application_number, user_id, club_id, motivation, career_interest, experience, submitted_at, updated_at) VALUES ('application', 'APP-001', 'student', 'club', 'Motivation', 'Career', 'Experience', ?, ?)").run(now, now);
  assert.equal(db.prepare("SELECT status FROM applications WHERE id = 'application'").get().status, "submitted");
  db.prepare("UPDATE applications SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = 'application'").run(now + 1, now + 1);
  db.prepare("UPDATE applications SET status = 'approved', reviewed_at = ?, reviewed_by = 'admin', review_comment = 'Approved', updated_at = ? WHERE id = 'application'").run(now + 2, now + 2);
  db.prepare("INSERT INTO teacher_clubs (id, teacher_user_id, club_id, created_at, created_by) VALUES ('assignment', 'teacher', 'club', ?, 'admin')").run(now);
  db.prepare("UPDATE applications SET status = 'rejected', reviewed_by = 'teacher', review_comment = 'Reviewed', updated_at = ? WHERE id = 'application'").run(now + 3);
  db.prepare("INSERT INTO posts (id, author_user_id, author_alias, category, title, content, created_at, updated_at) VALUES ('post', 'student', 'student-alias', 'general', 'Title', 'Content', ?, ?)").run(now, now);
  db.prepare("INSERT INTO post_comments (id, post_id, author_user_id, author_alias, content, created_at, updated_at) VALUES ('comment', 'post', 'teacher', 'teacher-alias', 'Reply', ?, ?)").run(now, now);
  db.prepare("INSERT INTO questions (id, author_user_id, author_alias, club_id, title, content, created_at, updated_at) VALUES ('question', 'student', 'student-alias', 'club', 'Question', 'Content', ?, ?)").run(now, now);
  db.prepare("INSERT INTO answers (id, question_id, author_user_id, author_role, content, created_at, updated_at) VALUES ('answer', 'question', 'teacher', 'club_manager', 'Answer', ?, ?)").run(now, now);
  db.prepare("INSERT INTO audit_logs (id, actor_user_id, actor_role, action_type, target_type, target_id, created_at) VALUES ('audit', 'admin', 'admin', 'application.status_changed', 'application', 'application', ?)").run(now);

  const before = Object.fromEntries(requiredTables.map((table) => [table, db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count]));
  db.exec(sql);
  const after = Object.fromEntries(requiredTables.map((table) => [table, db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count]));
  assert.deepEqual(after, before);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  db.close();
});

test("production migration rejects an incompatible pre-existing table instead of altering it", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL)");
  assert.throws(() => db.exec(sql), /no such column: auth_user_id/);
  assert.deepEqual(db.prepare("PRAGMA table_info(users)").all().map(({ name }) => name), ["id"]);
  db.close();
});

test("build plugin packages only the reviewed Sites migration directory", async () => {
  const plugin = await readFile(new URL("build/sites-vite-plugin.ts", root), "utf8");
  assert.match(plugin, /resolve\(root, "drizzle", "sites-production"\)/);
  assert.match(plugin, /resolve\(outputDirectory, "drizzle"\)/);
  assert.doesNotMatch(plugin, /resolve\(root, "drizzle"\)(?!,)/);
});
