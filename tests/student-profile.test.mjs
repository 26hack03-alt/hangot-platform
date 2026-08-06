import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("student profile migration is non-destructive and safely repeatable", async () => {
  const sql = await read("supabase/migrations/202608070001_student_profile.sql");
  for (const column of ["student_name", "student_number", "school_year", "profile_completed", "privacy_consent_at", "privacy_consent_version"]) assert.match(sql, new RegExp(`add column if not exists ${column}`));
  assert.match(sql, /profile_completed boolean not null default false/);
  assert.match(sql, /create unique index if not exists users_school_year_student_number_unique/);
  assert.match(sql, /where school_year is not null and student_number is not null/);
  assert.doesNotMatch(sql, /drop\s+(table|column)|delete\s+from|truncate/i);
});

test("existing users map to an incomplete nullable profile", async () => {
  const users = await read("app/lib/database/users.ts");
  assert.match(users, /studentName:r\.student_name\?\?null/);
  assert.match(users, /studentNumber:r\.student_number\?\?null/);
  assert.match(users, /profileCompleted:r\.profile_completed\?\?false/);
  assert.match(users, /privacyConsentAt:r\.privacy_consent_at\?new Date/);
});

test("profile API is session-scoped, allowlisted, validated, and consent-gated", async () => {
  const source = await read("app/api/profile/route.ts");
  assert.match(source, /await requireUser\(\)/);
  assert.match(source, /if \("error" in auth\) return auth\.error/);
  assert.match(source, /body\.privacyConsent !== true/);
  assert.match(source, /PRIVACY_CONSENT_REQUIRED/);
  assert.match(source, /INVALID_STUDENT_NAME/);
  assert.match(source, /INVALID_STUDENT_NUMBER/);
  assert.match(source, /INVALID_SCHOOL_YEAR/);
  assert.match(source, /STUDENT_NUMBER_ALREADY_USED/);
  assert.match(source, /updateOwnStudentProfile\(auth\.user\.id/);
  assert.doesNotMatch(source, /body\.(userId|authUserId|role|isActive)/);
  assert.doesNotMatch(source, /console\.(log|error)|auth_user_id|recovery_hash|email/);
});

test("profile updates cannot change identity, role, alias, or active status", async () => {
  const users = await read("app/lib/database/users.ts");
  const update = users.slice(users.indexOf("export async function updateOwnStudentProfile"), users.indexOf("export async function listTeacherCandidates"));
  for (const column of ["student_name", "student_number", "school_year", "profile_completed", "privacy_consent_at", "privacy_consent_version", "updated_at"]) assert.match(update, new RegExp(column));
  assert.doesNotMatch(update, /auth_user_id|recovery_hash|\brole\b|is_active|\balias\b/);
});

test("session and header use private profile display name while retaining alias", async () => {
  const [session, header] = await Promise.all([read("app/api/auth/session/route.ts"), read("app/components/HeaderSession.tsx")]);
  assert.match(session, /profileCompleted/);
  assert.match(session, /`\$\{user\.studentNumber\}-\$\{user\.studentName\}`/);
  assert.match(session, /: user\.alias/);
  assert.doesNotMatch(session, /authUserId|recoveryHash|email/);
  assert.match(header, /user\.displayName/);
  assert.match(header, /학생 정보 등록/);
  assert.match(header, /href=\{accountHref\}/);
  assert.match(header, /title=\{accountLabel\}/);
});

test("public board and Q&A continue to persist anonymous aliases and AI receives no profile data", async () => {
  const [posts, questions, home] = await Promise.all([read("app/api/posts/route.ts"), read("app/api/questions/route.ts"), read("app/page.tsx")]);
  assert.match(posts, /author_alias:auth\.user\.alias/);
  assert.match(questions, /author_alias:auth\.user\.alias/);
  for (const source of [posts, questions, home]) assert.doesNotMatch(source, /student(Name|Number)|student_(name|number)|authUserId|auth_user_id/);
});
