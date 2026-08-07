import { findApplication, reviewApplication } from "../../../../../lib/database/applications";
import { canAdminTransition, isApplicationStatus } from "../../../../../lib/application-admin";
import { checkRateLimit, hasOversizedBody } from "../../../../../lib/rate-limit";
import { requireUser, sameOrigin, sanitizeText } from "../../../../../lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 8_192)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "admin-application-review", identifier: auth.user.id, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  if (typeof body.reviewComment !== "undefined" && typeof body.reviewComment !== "string") return Response.json({ error: "INVALID_REVIEW_COMMENT" }, { status: 400 });
  if (typeof body.reviewComment === "string" && body.reviewComment.length > 1000) return Response.json({ error: "REVIEW_COMMENT_TOO_LONG" }, { status: 400 });
  if (!isApplicationStatus(body.status) || body.status === "submitted" || body.status === "cancelled") return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  const applicationId = (await params).id, current = await findApplication(applicationId);
  if (!current) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!canAdminTransition(current.status, body.status)) return Response.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 409 });
  const comment = sanitizeText(body.reviewComment, 1000) || null;
  try {
    await reviewApplication({ applicationId, expectedStatus: current.status, nextStatus: body.status, reviewComment: comment, actorUserId: auth.user.id, actorRole: "admin" });
  } catch {
    return Response.json({ error: "APPLICATION_CONFLICT" }, { status: 409 });
  }
  return Response.json({ application: { id: applicationId, status: body.status, reviewComment: comment, reviewedAt: new Date(), updatedAt: new Date() } });
}
