import "server-only";

type Entry = { count: number; resetAt: number };
type RateLimitOptions = { scope: string; identifier?: string; limit: number; windowMs: number };
const runtime = globalThis as typeof globalThis & { __hangotRateLimits?: Map<string, Entry> };
const entries = runtime.__hangotRateLimits ??= new Map<string, Entry>();

async function anonymousIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 120) || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${forwarded}|${agent}`));
  return Buffer.from(digest).toString("base64url").slice(0, 24);
}

export async function checkRateLimit(request: Request, options: RateLimitOptions) {
  pruneRateLimits();
  const now = Date.now();
  const identifier = options.identifier || await anonymousIdentifier(request);
  const key = `${options.scope}:${identifier}`;
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= options.limit) return null;
  return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))) } });
}

export function hasOversizedBody(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const size = Number(value);
  return Number.isFinite(size) && size > maxBytes;
}

export function pruneRateLimits() {
  if (entries.size < 2000) return;
  const now = Date.now();
  for (const [key, entry] of entries) if (entry.resetAt <= now) entries.delete(key);
}
