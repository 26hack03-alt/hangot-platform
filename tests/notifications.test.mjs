import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notification migration is non-destructive and private", async () => {
  const sql = await read("supabase/migrations/202608160001_notifications.sql");
  assert.match(sql, /create table if not exists public\.notifications/);
  for (const column of ["user_id", "type", "title", "message", "target_path", "is_read", "created_at", "read_at"]) assert.match(sql, new RegExp(`\\b${column}\\b`));
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.notifications from anon, authenticated/);
  assert.doesNotMatch(sql, /drop\s+table|truncate|delete\s+from/i);
});

test("application review atomically creates safe status notifications", async () => {
  const sql = await read("supabase/migrations/202608160001_notifications.sql");
  for (const status of ["under_review", "waiting", "approved", "rejected"]) assert.match(sql, new RegExp(`when '${status}'`));
  assert.match(sql, /insert into public\.notifications/);
  assert.match(sql, /v_current\.user_id/);
  assert.match(sql, /'\/my\/applications\/' \|\| p_application_id/);
  assert.match(sql, /TEACHER_SCOPE_REQUIRED/);
  assert.doesNotMatch(sql, /student_name|student_number|auth_user_id|email|access_token|refresh_token/i);
});

test("notification APIs are session scoped and ignore client user ids", async () => {
  const [list, readOne, readAll, repository] = await Promise.all([
    read("app/api/notifications/route.ts"),
    read("app/api/notifications/[id]/read/route.ts"),
    read("app/api/notifications/read-all/route.ts"),
    read("app/lib/database/notifications.ts"),
  ]);
  for (const source of [list, readOne, readAll]) {
    assert.match(source, /requireUser\(\)/);
    assert.match(source, /auth\.user\.id/);
    assert.doesNotMatch(source, /body\??\.userId|params\??\.userId|searchParams\.get\(["']userId/i);
  }
  for (const source of [readOne, readAll]) assert.match(source, /sameOrigin\(request\)/);
  assert.match(repository, /user_id:\s*`eq\.\$\{userId\}`/);
  assert.match(repository, /is_read:\s*"eq\.false"/);
  assert.match(list, /unreadCount/);
});

test("read and read-all update only the signed-in user's notifications", async () => {
  const repository = await read("app/lib/database/notifications.ts");
  assert.match(repository, /markOwnNotificationRead\(id: string, userId: string\)/);
  assert.match(repository, /id:\s*`eq\.\$\{id\}`[\s\S]*user_id:\s*`eq\.\$\{userId\}`/);
  assert.match(repository, /markAllOwnNotificationsRead\(userId: string\)/);
  assert.match(repository, /is_read:\s*true, read_at:/);
});

test("header bell exposes unread badge, panel, and internal-only navigation", async () => {
  const [header, home] = await Promise.all([read("app/components/HeaderSession.tsx"), read("app/page.tsx")]);
  assert.match(home, /<HeaderNotifications\s*\/>/);
  assert.match(header, /notification-badge/);
  assert.match(header, /모두 읽음/);
  assert.match(header, /새로운 알림이 없습니다/);
  assert.match(header, /target\.startsWith\("\/"\)/);
  assert.match(header, /!target\.startsWith\("\/\/"\)/);
  assert.match(header, /\/api\/notifications\/read-all/);
});
