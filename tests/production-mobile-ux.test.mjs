import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profile hides school year, retains the server default, and safely returns to next", async () => {
  const [client, page, api] = await Promise.all([read("app/profile/ProfileClient.tsx"), read("app/profile/page.tsx"), read("app/api/profile/route.ts")]);
  assert.doesNotMatch(client, /id="school-year"|htmlFor="school-year"/);
  assert.match(api, /DEFAULT_SCHOOL_YEAR = 2026/);
  assert.match(page, /safeInternalPath/);
  assert.match(client, /router\.replace\(next\)/);
});

test("application UX prevents duplicate actions and translates operational errors", async () => {
  const [apply, own] = await Promise.all([read("app/clubs/[clubId]/apply/ApplyClient.tsx"), read("app/my/applications/MyApplicationsClient.tsx")]);
  assert.match(apply, /if \(submitting\) return/);
  assert.match(apply, /disabled=\{submitting\}/);
  assert.match(apply, /RATE_LIMITED:[^\n]+요청이 너무 많습니다/);
  assert.match(apply, /INVALID_ORIGIN:[^\n]+새로고침/);
  assert.match(apply, /href=\{profileHref\}/);
  assert.match(own, /cancellingId/);
  for (const label of ["신청 완료", "검토 중", "대기", "승인", "반려", "취소"]) assert.match(own, new RegExp(label));
});

test("mobile layouts, filter reset, and role links remain available", async () => {
  const [css, admin, teacher, header] = await Promise.all([read("app/portal.css"), read("app/admin/applications/AdminApplicationsClient.tsx"), read("app/teacher/applications/TeacherApplicationsClient.tsx"), read("app/components/HeaderSession.tsx")]);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(admin, /onClick=\{reset\}>초기화/);
  assert.match(teacher, /onClick=\{reset\}>초기화/);
  assert.match(header, /href="\/my\/applications"/);
  assert.match(header, /href="\/teacher\/applications"/);
  assert.match(header, /href="\/admin\/applications"/);
});
