import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("schema and migrations preserve duplicate protection and add application fields", async () => {
  const [schema, numberMigration, interestMigration] = await Promise.all([read("db/schema.ts"), read("drizzle/0003_application_number.sql"), read("drizzle/0004_application_interest_area.sql")]);
  assert.match(schema, /publicId:\s*text\("application_number"\)\.notNull\(\)\.unique\(\)/);
  assert.match(schema, /interestArea:\s*text\("interest_area"\)/);
  assert.match(schema, /uniqueIndex\("application_user_club_unique"\)\.on\(table\.userId, table\.clubId\)/);
  assert.match(numberMigration, /RENAME COLUMN `public_id` TO `application_number`/);
  assert.match(interestMigration, /ADD COLUMN `interest_area` text/);
});

test("POST validates required input, trusts the session id, and handles duplicates", async () => {
  const route = await read("app/api/applications/route.ts");
  assert.match(route, /requireUser\(\["student"\]\)/);
  assert.match(route, /body\.confirmed !== true/);
  assert.match(route, /validInput\(body\.motivation, 20, 1000, true\)/);
  assert.match(route, /validInput\(body\.interestArea, 0, 300\)/);
  assert.match(route, /userId:\s*auth\.user\.id/);
  assert.doesNotMatch(route, /userId:\s*body\./);
  assert.match(route, /DUPLICATE_APPLICATION/);
  assert.match(route, /status:\s*"submitted"/);
});

test("my list and detail APIs scope every query to the session user and allowlist responses", async () => {
  const [list, detail] = await Promise.all([read("app/api/applications/me/route.ts"), read("app/api/applications/[id]/route.ts")]);
  for (const source of [list, detail]) {
    assert.match(source, /requireUser\(\)/);
    assert.match(source, /auth\.user\.id/);
    assert.doesNotMatch(source, /authUserId|googleId|email/i);
  }
  assert.match(detail, /eq\(applications\.id, applicationId\)[\s\S]*eq\(applications\.userId, auth\.user\.id\)/);
  assert.match(detail, /status:\s*404/);
  assert.doesNotMatch(list, /select\(\)\.from\(applications\)/);
});

test("cancel only allows the owner and cancellable states", async () => {
  const route = await read("app/api/applications/[id]/cancel/route.ts");
  assert.match(route, /eq\(applications\.userId, auth\.user\.id\)/);
  assert.match(route, /\["submitted", "under_review", "waiting"\]/);
  assert.match(route, /status:\s*"cancelled", cancelledAt: now, updatedAt: now/);
  assert.match(route, /CANNOT_CANCEL/);
});

test("application pages redirect unauthenticated users and expose safe UI flows", async () => {
  const [applyPage, applyClient, listPage, listClient, detailPage, detailClient] = await Promise.all([
    read("app/clubs/[clubId]/apply/page.tsx"), read("app/clubs/[clubId]/apply/ApplyClient.tsx"),
    read("app/my/applications/page.tsx"), read("app/my/applications/MyApplicationsClient.tsx"),
    read("app/my/applications/[applicationId]/page.tsx"), read("app/my/applications/[applicationId]/ApplicationDetailClient.tsx"),
  ]);
  assert.match(applyPage, /redirect\(`\/login\?next=/);
  assert.match(listPage, /redirect\("\/login\?next=%2Fmy%2Fapplications"\)/);
  assert.match(detailPage, /redirect\(`\/login\?next=/);
  assert.match(applyClient, /disabled=\{submitting\}/);
  assert.match(applyClient, /이미 이 동아리에 신청했습니다/);
  assert.match(applyClient, /이름, 학번, 반, 전화번호 등 개인정보를 작성하지 마세요/);
  assert.match(listClient, /\/api\/applications\/me/);
  assert.match(detailClient, /현재 상태에서는 신청을 취소할 수 없습니다/);
  assert.doesNotMatch(`${applyClient}${listClient}${detailClient}`, /authUserId|googleId|email/i);
});

test("existing Google login, club discovery, and AI recommendation entry points remain", async () => {
  const [login, home, header] = await Promise.all([read("app/login/page.tsx"), read("app/page.tsx"), read("app/components/HeaderSession.tsx")]);
  assert.match(login, /Google 계정으로 로그인/);
  assert.match(home, /AI 추천/);
  assert.match(home, /fetch\("\/api\/clubs"\)/);
  assert.match(header, /"\/my\/applications"/);
});
