import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("preserves club discovery and Google session navigation", async () => {
  const [page, layout, portalCss, header] = await Promise.all([
    read("app/page.tsx"),
    read("app/layout.tsx"),
    read("app/portal.css"),
    read("app/components/HeaderSession.tsx"),
  ]);
  assert.match(page, /새롬고의 모든 동아리/);
  assert.match(page, /AI 추천/);
  assert.match(header, /href="\/login"/);
  assert.match(page, /href="\/my\/applications"/);
  assert.match(page, /익명으로 신청하기/);
  assert.match(layout, /portal\.css/);
  assert.match(portalCss, /@media\(max-width:700px\)/);
});

test("database schema contains platform entities and no public identity columns", async () => {
  const [schema, migration, security, auth] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0001_anonymous_platform.sql"),
    read("app/lib/security.ts"),
    read("app/lib/supabase-auth.ts"),
  ]);
  for (const entity of ["users", "clubs", "applications", "posts", "postComments", "questions", "answers", "auditLogs", "syncJobs"]) {
    assert.match(schema, new RegExp(`export const ${entity}`));
  }
  assert.doesNotMatch(schema, /schoolEmail|encryptedName|studentNumber|phone|birth/i);
  assert.doesNotMatch(migration, /school_email|student_number|phone|birth_date/i);
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /sameSite:\s*"lax"/);
  assert.match(security, /hasPersonalDataPattern/);
});

test("required API and privacy setup files exist", async () => {
  const required = [
    "app/api/auth/google/route.ts",
    "app/api/auth/session/route.ts",
    "app/api/applications/route.ts",
    "app/api/posts/route.ts",
    "app/api/questions/route.ts",
    "app/api/admin/sync/route.ts",
    "AUTH_SETUP.md",
    "DATABASE_SETUP.md",
    "GOOGLE_SHEETS_SETUP.md",
    "ADMIN_GUIDE.md",
    "PRIVACY_CHECKLIST.md",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
});

test("production build packages only reviewed Sites D1 migrations", async () => {
  const plugin = await read("build/sites-vite-plugin.ts");
  assert.match(plugin, /resolve\(root, "drizzle", "sites-production"\)/);
  assert.match(plugin, /resolve\(outputDirectory, "drizzle"\)/);
  assert.match(plugin, /only the reviewed Sites production migrations/);
});
