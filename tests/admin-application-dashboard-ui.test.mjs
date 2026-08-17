import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=(path)=>readFile(new URL(path,root),"utf8");

test("admin application workspace reuses the shared admin shell",async()=>{
 const[shell,dashboard,list]=await Promise.all([read("app/admin/AdminShell.tsx"),read("app/admin/AdminClient.tsx"),read("app/admin/applications/AdminApplicationsClient.tsx")]);
 assert.match(shell,/HeaderNotifications/);assert.match(shell,/HeaderAccount/);assert.match(shell,/aria-current/);
 assert.match(dashboard,/AdminShell/);assert.match(list,/AdminShell/);assert.match(list,/activePath="\/admin\/applications"/);
});

test("admin application list provides filters, live summary, responsive table, and detail drawer",async()=>{
 const source=await read("app/admin/applications/AdminApplicationsClient.tsx");
 for(const term of["통합 검색","전체 동아리","전체 상태","시작일","종료일","초기화","총 ","신청일 최신순","admin-application-table","admin-application-drawer","신청 상세 정보","지원서 내용","관리자 처리","검토 의견","작성하지 않음"])assert.match(source,new RegExp(term));
 assert.match(source,/\/api\/admin\/applications\/\$\{selectedId\}/);assert.match(source,/\/status/);assert.match(source,/APPLICATION_CONFLICT/);assert.match(source,/maxLength=\{1000\}/);assert.match(source,/aria-label="신청 상세 닫기"/);
});

test("admin application date filters remain server-side and privacy-scoped",async()=>{
 const[route,repository]=await Promise.all([read("app/api/admin/applications/route.ts"),read("app/lib/database/applications.ts")]);
 assert.match(route,/params\.get\("startDate"\)/);assert.match(route,/params\.get\("endDate"\)/);assert.match(repository,/submitted_at/);assert.match(repository,/gte\./);assert.match(repository,/lte\./);
 assert.doesNotMatch(route,/auth_user_id|email|recovery_hash|token/i);
});

test("admin application workspace has desktop drawer and mobile card rules",async()=>{
 const css=await read("app/portal.css");
 assert.match(css,/\.admin-applications-workspace/);assert.match(css,/\.admin-application-drawer/);assert.match(css,/\.admin-application-table/);assert.match(css,/@media\(max-width:1024px\)/);assert.match(css,/@media\(max-width:700px\)/);
});
