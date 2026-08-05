import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { applications, auditLogs } from "../../../../../../db/schema";
import { canAdminTransition, isApplicationStatus } from "../../../../../lib/application-admin";
import { id, requireUser, sameOrigin, sanitizeText } from "../../../../../lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  if (typeof body.reviewComment !== "undefined" && typeof body.reviewComment !== "string") return Response.json({ error: "INVALID_REVIEW_COMMENT" }, { status: 400 });
  if (typeof body.reviewComment === "string" && body.reviewComment.length > 1000) return Response.json({ error: "REVIEW_COMMENT_TOO_LONG" }, { status: 400 });
  if (!isApplicationStatus(body.status) || body.status === "submitted" || body.status === "cancelled") {
    return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  const applicationId = (await params).id;
  const db = getDb();
  const current = await db.query.applications.findFirst({ where: eq(applications.id, applicationId) });
  if (!current) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!canAdminTransition(current.status, body.status)) return Response.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 409 });
  const reviewComment = sanitizeText(body.reviewComment, 1000) || null;
  const now = new Date();
  const updated = await db.update(applications).set({
    status: body.status,
    reviewComment,
    reviewedAt: now,
    reviewedBy: auth.user.id,
    updatedAt: now,
    googleSheetSynced: false,
  }).where(and(eq(applications.id, applicationId), eq(applications.status, current.status))).returning({ id: applications.id });
  if (!updated.length) return Response.json({ error: "APPLICATION_CONFLICT" }, { status: 409 });
  await db.insert(auditLogs).values({
    id: id("audit"), actorUserId: auth.user.id, actorRole: "admin", actionType: "application.status_changed",
    targetType: "application", targetId: applicationId,
    beforeData: JSON.stringify({ status: current.status, reviewComment: current.reviewComment }),
    afterData: JSON.stringify({ status: body.status, reviewComment }), createdAt: now,
  });
  return Response.json({ application: { id: applicationId, status: body.status, reviewComment, reviewedAt: now, updatedAt: now } });
}
