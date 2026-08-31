import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applicationPeriodError, applicationPeriodStatus } from "../app/lib/application-period.ts";

const root=new URL("../",import.meta.url),read=path=>readFile(new URL(path,root),"utf8");

test("global application period uses start-inclusive and end-exclusive server boundaries",()=>{
 const settings={startAt:"2026-09-01T00:00:00.000Z",endAt:"2026-09-02T00:00:00.000Z"};
 assert.equal(applicationPeriodStatus({startAt:null,endAt:null},new Date("2026-09-01T12:00:00Z")),"not_configured");
 assert.equal(applicationPeriodStatus(settings,new Date("2026-08-31T23:59:59.999Z")),"before");
 assert.equal(applicationPeriodStatus(settings,new Date(settings.startAt)),"open");
 assert.equal(applicationPeriodStatus(settings,new Date("2026-09-01T23:59:59.999Z")),"open");
 assert.equal(applicationPeriodStatus(settings,new Date(settings.endAt)),"closed");
 assert.equal(applicationPeriodError("not_configured"),"APPLICATION_PERIOD_NOT_CONFIGURED");
 assert.equal(applicationPeriodError("before"),"APPLICATION_PERIOD_NOT_STARTED");
 assert.equal(applicationPeriodError("closed"),"APPLICATION_PERIOD_CLOSED");
});

test("settings migration is singleton, constrained, and service-role only",async()=>{const sql=await read("supabase/migrations/202608310001_application_settings.sql");assert.match(sql,/id text primary key check \(id = 'global_application_period'\)/);assert.match(sql,/application_end_at > application_start_at/);assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.application_settings from public, anon, authenticated/);assert.match(sql,/grant all on public\.application_settings to service_role/)});

test("admin settings writes keep the existing admin security controls and audit",async()=>{const route=await read("app/api/admin/application-settings/route.ts");assert.match(route,/requireUser\(\["admin"\]\)/);assert.match(route,/sameOrigin\(request\)/);assert.match(route,/hasOversizedBody\(request, 2_048\)/);assert.match(route,/checkRateLimit/);assert.match(route,/parseSeoulDateTime/);assert.match(route,/date\.getTime\(\)===expected/);assert.match(route,/INVALID_APPLICATION_PERIOD/);assert.match(route,/application_period\.updated/);assert.match(route,/writeAudit/);assert.doesNotMatch(route,/studentName|studentNumber|email|authUserId|token/i)});

test("student period API exposes only read-only period state",async()=>{const route=await read("app/api/application-period/route.ts");assert.match(route,/export async function GET/);assert.match(route,/applicationPeriodSnapshot/);assert.doesNotMatch(route,/updatedBy|updated_by|actor|user_id|PATCH|POST/)});

test("application creation enforces global period immediately before insert",async()=>{const route=await read("app/api/applications/route.ts");for(const error of["APPLICATION_PERIOD_NOT_CONFIGURED","APPLICATION_PERIOD_NOT_STARTED","APPLICATION_PERIOD_CLOSED"])assert.match(await read("app/lib/application-period.ts"),new RegExp(error));assert.match(route,/applicationPeriodSnapshot\(\)/);assert.match(route,/applicationPeriodError\(globalPeriod\.status\)/);assert.ok(route.indexOf("applicationPeriodSnapshot()")<route.indexOf("createApplication({"));assert.match(route,/applicationAvailability\(sourceClub\.recruitment_status\)/);assert.match(route,/club\.application_start_at/)});

test("period closure does not modify the existing cancellation path",async()=>{const cancel=await read("app/api/applications/[id]/cancel/route.ts");assert.match(cancel,/\["submitted", "under_review", "waiting"\]/);assert.doesNotMatch(cancel,/applicationPeriod|application-settings|APPLICATION_PERIOD_/)});

test("detail and direct apply UI explain unavailable period states",async()=>{const[detail,apply]=await Promise.all([read("app/clubs/[clubId]/ClubDetailClient.tsx"),read("app/clubs/[clubId]/apply/ApplyClient.tsx")]);for(const source of[detail,apply]){assert.match(source,/\/api\/application-period/);assert.match(source,/not_configured/);assert.match(source,/before/);assert.match(source,/closed/)}assert.match(detail,/신청 기간 미설정/);assert.match(detail,/신청 종료/);assert.match(detail,/가입 문의/);assert.match(apply,/application-period-blocked/);assert.match(apply,/동아리 신청 기간이 아직 설정되지 않았습니다/)});

test("home and club list do not present global-closed clubs as application-open",async()=>{const[home,clubs]=await Promise.all([read("app/page.tsx"),read("app/clubs/page.tsx")]);for(const source of[home,clubs]){assert.match(source,/combinedRecruitmentLabel/);assert.match(source,/\/api\/application-period/);assert.match(source,/신청 기간 전/);assert.match(source,/신청 종료/);assert.match(source,/신청 기간 미설정/)}assert.match(clubs,/openStatus\(club\.recruitment_status\)&&periodStatus==="open"/)});

test("admin navigation and settings UI expose Seoul-local start and end controls",async()=>{const[shell,client]=await Promise.all([read("app/admin/AdminShell.tsx"),read("app/admin/application-settings/ApplicationSettingsClient.tsx")]);assert.match(shell,/href:"\/admin\/application-settings"/);assert.match(client,/Asia\/Seoul/);assert.match(client,/type="datetime-local"/);assert.match(client,/신청 시작 시각/);assert.match(client,/신청 종료 시각/);assert.match(client,/신청 기간 저장/)});
