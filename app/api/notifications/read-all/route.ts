import { markAllOwnNotificationsRead } from "../../../lib/database/notifications";
import { checkRateLimit, hasOversizedBody } from "../../../lib/rate-limit";
import { requireUser, sameOrigin } from "../../../lib/security";

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 1_024)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "notifications-read-all", identifier: auth.user.id, limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  await markAllOwnNotificationsRead(auth.user.id);
  return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
