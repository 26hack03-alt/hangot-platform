import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { applications, syncJobs } from "../../../../../db/schema";
import { id, requireUser, sameOrigin } from "../../../../lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const applicationId = (await params).id;
  const row = await getDb().query.applications.findFirst({ where: and(eq(applications.id, applicationId), eq(applications.userId, auth.user.id)) });
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!["submitted", "under_review", "waiting"].includes(row.status)) return Response.json({ error: "CANNOT_CANCEL" }, { status: 409 });
  const now = new Date();
  const db = getDb();
  await db.batch([
    db.update(applications).set({ status: "cancelled", cancelledAt: now, updatedAt: now, googleSheetSynced: false }).where(and(eq(applications.id, applicationId), eq(applications.userId, auth.user.id), inArray(applications.status, ["submitted", "under_review", "waiting"]))),
    db.insert(syncJobs).values({ id: id("sync"), dataType: "application", sourceId: applicationId, operation: "cancel", payload: JSON.stringify({ publicId: row.publicId, status: "cancelled", updatedAt: now.toISOString() }), status: "pending", createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [syncJobs.dataType, syncJobs.sourceId, syncJobs.operation], set: { payload: JSON.stringify({ publicId: row.publicId, status: "cancelled", updatedAt: now.toISOString() }), status: "pending", updatedAt: now } }),
  ]);
  return Response.json({ ok: true, status: "cancelled" });
}
