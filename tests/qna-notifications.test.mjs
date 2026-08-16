import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("application approval and rejection notifications use explicit copy", async () => {
  const sql = await read("supabase/migrations/202608160002_qna_answer_notifications.sql");
  assert.match(sql, /when 'approved' then v_title := '동아리 신청이 승인되었습니다\.'; v_message := v_club_name \|\| ' 신청이 승인되었습니다\.'/);
  assert.match(sql, /when 'rejected' then v_title := '동아리 신청이 반려되었습니다\.'; v_message := v_club_name \|\| ' 신청이 반려되었습니다\.'/);
  assert.match(sql, /'\/my\/applications\/' \|\| p_application_id/);
  assert.doesNotMatch(sql, /동아리 신청 결과가 변경되었습니다/);
});

test("waiting to answered creates one notification for the real question author", async () => {
  const sql = await read("supabase/migrations/202608160002_qna_answer_notifications.sql");
  assert.match(sql, /select \* into v_question[\s\S]*for update/);
  assert.match(sql, /v_question\.status <> 'waiting'/);
  assert.match(sql, /update public\.questions set status = 'answered'/);
  assert.match(sql, /insert into public\.notifications[\s\S]*v_question\.author_user_id[\s\S]*'qna_answered'/);
  assert.match(sql, /'질문에 답변이 등록되었습니다\.'/);
  assert.match(sql, /coalesce\(v_club_name, '동아리'\) \|\| '에 남긴 질문에 답변이 등록되었습니다\.'/);
});

test("private questions use the same author-only notification without content disclosure", async () => {
  const sql = await read("supabase/migrations/202608160002_qna_answer_notifications.sql");
  const answerFunction = sql.split("create or replace function public.answer_question")[1] ?? "";
  const notificationInsert = answerFunction.match(/insert into public\.notifications\(id, user_id, type, title, message, target_path\)[\s\S]*?return v_updated;/)?.[0] ?? "";
  assert.match(notificationInsert, /v_question\.author_user_id/);
  assert.match(notificationInsert, /'\/questions'/);
  assert.doesNotMatch(notificationInsert, /v_question\.(title|content|author_alias)|p_answer_content|review_comment/);
  assert.doesNotMatch(notificationInsert, /student_name|student_number|auth_user_id|email|access_token|refresh_token/i);
  assert.doesNotMatch(sql, /is_private\s*=\s*false/);
});

test("already answered questions cannot create duplicate answers or notifications", async () => {
  const [sql, route] = await Promise.all([
    read("supabase/migrations/202608160002_qna_answer_notifications.sql"),
    read("app/api/questions/[id]/answer/route.ts"),
  ]);
  assert.match(sql, /if v_question\.status <> 'waiting' then raise exception 'QUESTION_ALREADY_ANSWERED'/);
  assert.match(route, /question\.status !== "waiting"/);
  assert.match(route, /QUESTION_ALREADY_ANSWERED/);
  assert.match(route, /QUESTION_CONFLICT/);
});

test("answer API preserves admin and assigned-teacher scope", async () => {
  const route = await read("app/api/questions/[id]/answer/route.ts");
  assert.match(route, /requireUser\(\["admin", "club_manager"\]\)/);
  assert.match(route, /teacherClubIds\(auth\.user\.id\)/);
  assert.match(route, /includes\(question\.club_id\)/);
  assert.match(route, /sameOrigin\(request\)/);
  assert.doesNotMatch(route, /body\??\.(userId|authorUserId)|studentName|studentNumber|email/i);
});
