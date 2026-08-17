import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin dashboard overview remains admin-only and uses live operational data", async () => {
  const source = await read("app/api/admin/overview/route.ts");
  assert.match(source, /requireUser\(\["admin"\]\)/);
  for (const term of ["applicationStatusCounts", "listApplications", "listActionableApplications", "club_manager", "questions", "clubs"]) {
    assert.match(source, new RegExp(term));
  }
  assert.doesNotMatch(source, /auth_user_id|email|recovery_hash|review_comment|motivation/i);
});

test("admin dashboard exposes the requested work-focused information hierarchy", async () => {
  const [source,shell] = await Promise.all([read("app/admin/AdminClient.tsx"),read("app/admin/AdminShell.tsx")]);
  for (const label of ["관리자 대시보드", "처리 필요한 신청", "운영 현황", "최근 신청", "바로가기", "전체 신청", "검토 대기", "승인", "반려", "담당 교사", "운영 동아리"]) {
    assert.match(source, new RegExp(label));
  }
  for (const href of ["/admin", "/admin/applications", "/admin/teachers", "/admin/teacher-assignments"]) {
    assert.match(source, new RegExp(`href=[{]?\`?\"?${href.replaceAll("/", "\\/")}`));
  }
  assert.doesNotMatch(source, /href="\/admin\/(clubs|questions|notices|statistics|settings)"/);
  assert.match(shell, /HeaderNotifications/);
  assert.match(shell, /aria-current/);
});

test("admin dashboard styles support desktop, tablet, and mobile without a horizontal table trap", async () => {
  const css = await read("app/portal.css");
  assert.match(css, /\.admin-dashboard-shell/);
  assert.match(css, /\.admin-dashboard-sidebar/);
  assert.match(css, /\.admin-kpi-grid/);
  assert.match(css, /@media\(max-width:1024px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /\.admin-recent-table/);
  assert.match(css, /\.admin-mobile-menu/);
});
