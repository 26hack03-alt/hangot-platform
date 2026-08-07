import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("sensitive routes use bounded rate limits and stable 429 responses", async () => {
  const limiter = await read("app/lib/rate-limit.ts");
  assert.match(limiter, /status: 429/);
  assert.match(limiter, /"Retry-After"/);
  assert.match(limiter, /SHA-256/);
  assert.doesNotMatch(limiter, /console\.(log|error)/);
  const routes = await Promise.all(["app/api/auth/google/route.ts","app/auth/callback/route.ts","app/api/profile/route.ts","app/api/applications/route.ts","app/api/applications/[id]/cancel/route.ts","app/api/admin/applications/[id]/status/route.ts","app/api/teacher/applications/[id]/status/route.ts"].map(read));
  for (const source of routes) assert.match(source, /checkRateLimit/);
  for (const source of routes.slice(2)) assert.match(source, /hasOversizedBody/);
});

test("security headers are production-wide without blocking OAuth navigation", async () => {
  const config = JSON.parse(await read("vercel.json"));
  const headers = Object.fromEntries(config.headers[0].headers.map(item => [item.key, item.value]));
  for (const name of ["Content-Security-Policy","X-Content-Type-Options","X-Frame-Options","Referrer-Policy","Permissions-Policy","Strict-Transport-Security"]) assert.ok(headers[name]);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Content-Security-Policy"], /https:\/\/\*\.supabase\.co/);
});

test("state changes validate origin and cross-site fetch metadata", async () => {
  const security = await read("app/lib/security.ts");
  assert.match(security, /ALLOWED_ORIGIN/);
  assert.match(security, /APP_URL/);
  assert.match(security, /sec-fetch-site/);
  assert.match(security, /same-origin/);
  const routes = await Promise.all(["app/api/profile/route.ts","app/api/applications/route.ts","app/api/applications/[id]/cancel/route.ts","app/api/admin/applications/[id]/status/route.ts","app/api/teacher/applications/[id]/status/route.ts","app/api/admin/users/[id]/role/route.ts","app/api/admin/teacher-assignments/route.ts","app/api/admin/teacher-assignments/[id]/route.ts"].map(read));
  for (const source of routes) assert.match(source, /sameOrigin\(request\)/);
});

test("audit RPC verifies actor roles and stores no review comment body", async () => {
  const sql = await read("supabase/migrations/202608070002_harden_application_audit.sql");
  assert.match(sql, /role = 'admin' and is_active/);
  assert.match(sql, /role = 'club_manager' and is_active/);
  assert.match(sql, /TEACHER_SCOPE_REQUIRED/);
  assert.match(sql, /reviewCommentPresent/);
  assert.doesNotMatch(sql, /jsonb_build_object\('status', v_current\.status, 'reviewComment',/);
  assert.doesNotMatch(sql, /drop\s+(table|column)|truncate|delete\s+from/i);
});

test("database errors and client code do not expose service credentials", async () => {
  const client = await read("app/lib/database/client.ts");
  assert.match(client, /SERVER_DATABASE_NOT_CONFIGURED/);
  assert.match(client, /new DatabaseError\("DATABASE_REQUEST_FAILED"/);
  assert.doesNotMatch(client, /new DatabaseError\(\s*detail\.message/);
  async function walk(url) { const entries = await readdir(url, { withFileTypes: true }); const files = []; for (const entry of entries) { const child = new URL(`${entry.name}${entry.isDirectory()?"/":""}`, url); if (entry.isDirectory()) files.push(...await walk(child)); else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(child); } return files; }
  for (const file of await walk(new URL("app/", root))) { const source = await readFile(file, "utf8"); if (/^[\s\S]*?"use client"/.test(source.slice(0,100))) assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/); }
});

test("session cookies retain secure production attributes and private responses stay scoped", async () => {
  const [auth, session, posts, questions, clubs, home] = await Promise.all([read("app/lib/supabase-auth.ts"),read("app/api/auth/session/route.ts"),read("app/api/posts/route.ts"),read("app/api/questions/route.ts"),read("app/api/clubs/route.ts"),read("app/page.tsx")]);
  for (const attribute of [/httpOnly: true/,/secure: process\.env\.NODE_ENV === "production"/,/sameSite: "lax"/,/path: "\/"/,/maxAge/]) assert.match(auth, attribute);
  assert.doesNotMatch(session, /email|authUserId|recoveryHash/);
  for (const source of [posts,questions,clubs,home]) assert.doesNotMatch(source, /studentName|studentNumber|student_name|student_number/);
});
