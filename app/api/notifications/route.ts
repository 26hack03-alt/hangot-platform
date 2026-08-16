import { countOwnUnreadNotifications, listOwnNotifications, safeNotificationPath } from "../../lib/database/notifications";
import { checkRateLimit } from "../../lib/rate-limit";
import { requireUser } from "../../lib/security";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const limited = await checkRateLimit(request, { scope: "notifications-read", identifier: auth.user.id, limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const [rows, unreadCount] = await Promise.all([
    listOwnNotifications(auth.user.id),
    countOwnUnreadNotifications(auth.user.id),
  ]);
  return Response.json({
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      targetPath: safeNotificationPath(row.target_path),
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at,
    })),
    unreadCount,
  }, { headers: { "cache-control": "private, no-store" } });
}
