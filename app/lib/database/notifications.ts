import "server-only";
import { databaseRequest, query } from "./client";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  target_path: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

const publicFields = "id,type,title,message,target_path,is_read,created_at,read_at";

export function safeNotificationPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : null;
}

export async function listOwnNotifications(userId: string) {
  return databaseRequest<NotificationRow[]>(`notifications?${query({
    select: publicFields,
    user_id: `eq.${userId}`,
    order: "created_at.desc",
    limit: 50,
  })}`);
}

export async function countOwnUnreadNotifications(userId: string) {
  const rows = await databaseRequest<Array<{ id: string }>>(`notifications?${query({
    select: "id",
    user_id: `eq.${userId}`,
    is_read: "eq.false",
  })}`);
  return rows.length;
}

export async function markOwnNotificationRead(id: string, userId: string) {
  return databaseRequest<NotificationRow[]>(`notifications?${query({
    id: `eq.${id}`,
    user_id: `eq.${userId}`,
    select: publicFields,
  })}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  });
}

export async function markAllOwnNotificationsRead(userId: string) {
  await databaseRequest(`notifications?${query({ user_id: `eq.${userId}`, is_read: "eq.false" })}`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  });
}
