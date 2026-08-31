import { ensureUser, findUserByAuthId } from "./database/users";
import { claimAllowedAccount } from "./database/allowed-accounts";
import { providerUser, type GoogleAuthUser } from "./supabase-auth";

export type Role = "student" | "club_manager" | "admin";

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
export function shortCode(prefix: string, length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return `${prefix}-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/\0/g, "").trim().slice(0, maxLength);
}
export function hasPersonalDataPattern(value: string) {
  return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|01[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{6}[-\s]?[1-4]\d{6}|(?:카톡|텔레그램|인스타|연락처|주소)\s*[:：]?\s*\S+/i.test(value);
}
export function sheetSafe(value: string) {
  return /^[\u0000-\u0020]*[=+\-@]/.test(value) ? `'${value}` : value;
}
export async function currentUser() {
  const authUser = await providerUser();
  if (!authUser) return null;
  const user = await findUserByAuthId(authUser.id);
  return user?.isActive ? user : null;
}
export async function ensureGoogleAppUser(authUser: GoogleAuthUser) {
  const existing = await findUserByAuthId(authUser.id);
  if (existing) return existing;
  const now = new Date();
  const alias = `학생-${(await sha256(authUser.id)).slice(0, 4).toUpperCase()}`;
  return ensureUser({ id: id("usr"), authUserId: authUser.id, alias, recoveryHash: `google:${authUser.id}`, now });
}
export async function claimApprovedGoogleAppUser(authUser:GoogleAuthUser,email:string){
  const existing=await findUserByAuthId(authUser.id);if(existing)return existing;
  const userId=id("usr"),alias=`학생-${(await sha256(authUser.id)).slice(0,4).toUpperCase()}`,now=new Date().toISOString();
  const claimed=await claimAllowedAccount({email,authUserId:authUser.id,userId,alias,recoveryHash:`google:${authUser.id}`,now});
  return claimed?findUserByAuthId(authUser.id):null;
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) return { error: Response.json({ error: "AUTH_REQUIRED" }, { status: 401 }) };
  if (roles && !roles.includes(user.role as Role)) return { error: Response.json({ error: "FORBIDDEN" }, { status: 403 }) };
  return { user };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.ALLOWED_ORIGIN]) {
    if (!value) continue;
    try { allowed.add(new URL(value).origin); } catch { /* Invalid configuration is never trusted. */ }
  }
  if (origin) {
    try { return allowed.has(new URL(origin).origin); } catch { return false; }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}
