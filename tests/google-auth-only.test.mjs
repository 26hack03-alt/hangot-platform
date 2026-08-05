import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("../",import.meta.url);const read=p=>readFile(new URL(p,root),"utf8");
test("removes anonymous endpoints and login UI",async()=>{await assert.rejects(access(new URL("app/api/auth/anonymous/route.ts",root)));await assert.rejects(access(new URL("app/api/auth/recover/route.ts",root)));const login=await read("app/login/page.tsx");assert.match(login,/Google 계정으로 로그인/);assert.doesNotMatch(login,/익명|복구 코드/)});
test("uses Google PKCE callback and safe internal return paths",async()=>{const[start,callback,auth]=await Promise.all([read("app/api/auth/google/route.ts"),read("app/auth/callback/route.ts"),read("app/lib/supabase-auth.ts")]);assert.match(start,/provider", "google"/);assert.match(start,/code_challenge_method", "s256"/);assert.match(callback,/grant_type=pkce/);assert.match(auth,/safeInternalPath/)});
test("forces new users to student and keeps secrets out of the login UI",async()=>{const security=await read("app/lib/security.ts");assert.match(security,/role: "student"/);const login=await read("app/login/page.tsx");assert.doesNotMatch(login,/SERVICE_ROLE|CLIENT_SECRET|access_token|refresh_token|process\.env/)});
