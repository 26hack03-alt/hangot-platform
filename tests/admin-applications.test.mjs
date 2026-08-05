import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin application APIs require an active admin session on the server", async () => {
  const [security, list, detail, status] = await Promise.all([read("app/lib/security.ts"), read("app/api/admin/applications/route.ts"), read("app/api/admin/applications/[id]/route.ts"), read("app/api/admin/applications/[id]/status/route.ts")]);
  assert.match(security, /return user\?\.isActive \? user : null/);
  for (const source of [list, detail, status]) assert.match(source, /requireUser\(\["admin"\]\)/);
  assert.match(security, /status: 401/);
  assert.match(security, /status: 403/);
});

test("admin list supports safe filtering, search, sorting, and bounded pagination", async () => {
  const route = await read("app/api/admin/applications/route.ts");
  for (const field of ["status", "clubId", "search", "page", "pageSize", "sort"]) assert.match(route, new RegExp(`params\\.get\\("${field}"\\)`));
  assert.match(route, /Math\.min\(100,/);
  assert.match(route, /like\(applications\.publicId/);
  assert.match(route, /like\(users\.alias/);
  assert.match(route, /like\(clubs\.name/);
  assert.match(route, /like\(applications\.motivation/);
  assert.doesNotMatch(route, /authUserId|recoveryHash|email|token/i);
});

test("admin detail response is allowlisted and excludes private identity", async () => {
  const route = await read("app/api/admin/applications/[id]/route.ts");
  for (const field of ["applicationNumber", "userAlias", "motivation", "interestArea", "reviewComment"]) assert.match(route, new RegExp(`${field}:`));
  assert.doesNotMatch(route, /authUserId|recoveryHash|email|oauth|token/i);
});

test("status transition rules allow only the requested forward transitions", async () => {
  const rules = await read("app/lib/application-admin.ts");
  assert.match(rules, /submitted: \["under_review", "approved", "rejected"\]/);
  assert.match(rules, /under_review: \["waiting", "approved", "rejected"\]/);
  assert.match(rules, /waiting: \["approved", "rejected"\]/);
  assert.match(rules, /approved: \[\]/);
  assert.match(rules, /rejected: \[\]/);
  assert.match(rules, /cancelled: \[\]/);
});

test("status update validates comments, uses session admin, detects conflicts, and audits", async () => {
  const route = await read("app/api/admin/applications/[id]/status/route.ts");
  assert.match(route, /reviewComment\.length > 1000/);
  assert.match(route, /reviewedBy: auth\.user\.id/);
  assert.match(route, /eq\(applications\.status, current\.status\)/);
  assert.match(route, /APPLICATION_CONFLICT/);
  assert.match(route, /application\.status_changed/);
  assert.match(route, /actorUserId: auth\.user\.id/);
  assert.match(route, /googleSheetSynced: false/);
  assert.doesNotMatch(route, /body\.(?:reviewedBy|adminId|role)/);
});

test("student detail exposes review status and comment without identity fields", async () => {
  const [api, page] = await Promise.all([read("app/api/applications/[id]/route.ts"), read("app/my/applications/[applicationId]/ApplicationDetailClient.tsx")]);
  assert.match(api, /reviewedAt: row\.reviewedAt/);
  assert.match(api, /reviewComment: row\.reviewComment/);
  assert.match(page, /검토 시각/);
  assert.match(page, /검토 의견/);
  assert.doesNotMatch(`${api}${page}`, /authUserId|googleId|email/i);
});

test("admin pages remain under the protected layout and dashboard links to management", async () => {
  const [layout, dashboard, listPage, detailPage] = await Promise.all([read("app/admin/layout.tsx"), read("app/admin/AdminClient.tsx"), read("app/admin/applications/page.tsx"), read("app/admin/applications/[applicationId]/page.tsx")]);
  assert.match(layout, /requirePageRole\(\["admin"\]/);
  assert.match(dashboard, /href="\/admin\/applications"/);
  assert.match(listPage, /AdminApplicationsClient/);
  assert.match(detailPage, /AdminApplicationDetailClient/);
});
