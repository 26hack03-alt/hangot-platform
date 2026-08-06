import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("header session UI uses the server session and logout APIs", async () => {
  const source = await read("app/components/HeaderSession.tsx");
  assert.match(source, /fetch\("\/api\/auth\/session"/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /fetch\("\/api\/auth\/logout"/);
  assert.match(source, /setUser\(null\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("header renders the private display name and only role-appropriate management links", async () => {
  const source = await read("app/components/HeaderSession.tsx");
  assert.match(source, /user\.displayName/);
  assert.match(source, /profileCompleted/);
  assert.match(source, /학생 정보 등록/);
  assert.match(source, /user\.role === "admin"/);
  assert.match(source, /href="\/admin"/);
  assert.match(source, /user\.role === "club_manager"/);
  assert.match(source, /href="\/teacher"/);
});

test("home header no longer hardcodes a login link", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /<HeaderSessionProvider>/);
  assert.match(source, /<HeaderAccount \/>/);
  assert.doesNotMatch(source, /<a href="\/login">로그인<\/a>/);
});
