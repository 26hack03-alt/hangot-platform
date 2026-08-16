import { markOwnNotificationRead } from "../../../../lib/database/notifications";
import { checkRateLimit, hasOversizedBody } from "../../../../lib/rate-limit";
import { requireUser, sameOrigin } from "../../../../lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 1_024)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "notification-read", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const notificationId = (await params).id;
  if (!/^noti_[a-zA-Z0-9]+$/.test(notificationId)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const rows = await markOwnNotificationRead(notificationId, auth.user.id);
  if (!rows.length) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
