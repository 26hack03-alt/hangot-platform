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
  const [schema, security, auth] = await Promise.all([
    read("supabase/migrations/202608060001_vercel_postgres_schema.sql"),
    read("app/lib/security.ts"),
    read("app/lib/supabase-auth.ts"),
  ]);
  for (const entity of ["users", "clubs", "applications", "posts", "post_comments", "questions", "answers", "audit_logs", "sync_jobs"]) {
    assert.match(schema, new RegExp(`public\\.${entity}`));
  }
  assert.doesNotMatch(schema, /schoolEmail|encryptedName|studentNumber|phone|birth/i);
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

test("production build uses Nitro Vercel output instead of Sites packaging", async () => {
  const [vite, vercel] = await Promise.all([read("vite.config.ts"), read("vercel.json")]);
  assert.match(vite, /nitro\(\)/);
  assert.doesNotMatch(vite, /sites\(\)|cloudflare/i);
  assert.match(vercel, /\.output/);
});
