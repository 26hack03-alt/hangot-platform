import { cookies } from "next/headers";

const ACCESS_COOKIE = "hangot_google_access";
const REFRESH_COOKIE = "hangot_google_refresh";
const VERIFIER_COOKIE = "hangot_google_verifier";
const NEXT_COOKIE = "hangot_google_next";

export type GoogleAuthUser = { id: string; email?: string };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("AUTH_NOT_CONFIGURED");
  return { url, key };
}

export function safeInternalPath(value: string | null | undefined, fallback = "/") {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

export function randomBase64Url(bytes = 32) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("content-type", "application/json");
  return fetch(`${url}/auth/v1${path}`, { ...init, headers, cache: "no-store" });
}

export function publicAuthConfig() { return config(); }

export async function setOAuthFlow(verifier: string, next: string) {
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set(VERIFIER_COOKIE, verifier, options);
  jar.set(NEXT_COOKIE, safeInternalPath(next), options);
}

export async function readOAuthFlow() {
  const jar = await cookies();
  return { verifier: jar.get(VERIFIER_COOKIE)?.value, next: safeInternalPath(jar.get(NEXT_COOKIE)?.value) };
}

export async function clearOAuthFlow() {
  const jar = await cookies();
  jar.delete(VERIFIER_COOKIE);
  jar.delete(NEXT_COOKIE);
}

export async function setProviderSession(accessToken: string, refreshToken: string, expiresIn = 3600) {
  const jar = await cookies();
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  jar.set(ACCESS_COOKIE, accessToken, { ...base, maxAge: Math.max(60, expiresIn) });
  jar.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearProviderSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function providerAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function providerUser(): Promise<GoogleAuthUser | null> {
  const token = await providerAccessToken();
  if (!token) return null;
  const response = await authRequest("/user", { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json() as GoogleAuthUser;
  return user.id ? { id: user.id, email: user.email } : null;
}

export async function refreshProviderSession() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;
  const response = await authRequest("/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }).catch(() => null);
  if (!response?.ok) { await clearProviderSession(); return false; }
  const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
  await setProviderSession(data.access_token, data.refresh_token, data.expires_in);
  return true;
}
