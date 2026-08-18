import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url),read=path=>readFile(new URL(path,root),"utf8");

test("admin board route and APIs are protected by the server admin role",async()=>{const[layout,page,list,patch]=await Promise.all([read("app/admin/layout.tsx"),read("app/admin/board/page.tsx"),read("app/api/admin/posts/route.ts"),read("app/api/admin/posts/[id]/route.ts")]);assert.match(layout,/requirePageRole\(\["admin"\]/);assert.match(page,/AdminBoardClient/);for(const source of[list,patch])assert.match(source,/requireUser\(\["admin"\]\)/)});

test("admin post mutation is origin checked, rate limited, and field allowlisted",async()=>{const source=await read("app/api/admin/posts/[id]/route.ts");assert.match(source,/sameOrigin\(request\)/);assert.match(source,/checkRateLimit/);assert.match(source,/hasOversizedBody/);assert.match(source,/allowedKeys/);assert.match(source,/isHidden/);assert.match(source,/isNotice/);for(const field of["author_user_id","author_alias","created_at","title","content"])assert.doesNotMatch(source,new RegExp(`body\\.${field}`))});

test("board moderation uses soft state, safe audit payloads, and never deletes",async()=>{const[route,repo]=await Promise.all([read("app/api/admin/posts/[id]/route.ts"),read("app/lib/database/posts.ts")]);for(const action of["board.post_hidden","board.post_unhidden","board.notice_enabled","board.notice_disabled"])assert.match(route,new RegExp(action.replace(".","\\.")));assert.match(route,/target_type:"post"/);assert.match(route,/before_data:\{isHidden/);assert.match(route,/after_data:\{isHidden/);assert.doesNotMatch(`${route}${repo}`,/method:\s*"DELETE"|deletePost|review_comment|student_name|student_number|email/i)});

test("student board keeps hidden posts out and student notice escalation blocked",async()=>{const[repo,route]=await Promise.all([read("app/lib/database/posts.ts"),read("app/api/posts/route.ts")]);assert.match(repo,/is_hidden:"eq\.false"/);assert.match(repo,/deleted_at:"is\.null"/);assert.match(route,/auth\.user\.role!=="student"&&Boolean\(body\.isNotice\)/)});

test("admin board UI provides shared filters, responsive cards, drawer, and moderation actions",async()=>{const[shell,client,css]=await Promise.all([read("app/admin/AdminShell.tsx"),read("app/admin/board/AdminBoardClient.tsx"),read("app/portal.css")]);assert.match(shell,/href:"\/admin\/board"/);assert.match(client,/activePath="\/admin\/board"/);for(const value of["검색","카테고리","상태","공지","상세 보기","공지로 지정","공지 해제","숨기기","다시 공개"])assert.match(client,new RegExp(value));assert.match(client,/익명/);assert.doesNotMatch(client,/studentName|studentNumber|email|authorUserId/);assert.match(css,/\.admin-board-table/);assert.match(css,/@media\(max-width:700px\)[\s\S]*\.admin-board-table-row/);assert.match(css,/\.admin-board-drawer/)});
