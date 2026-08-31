import { cancelApplication, findApplication } from "../../../../lib/database/applications";
import { checkRateLimit, hasOversizedBody } from "../../../../lib/rate-limit";
import { requireUser, sameOrigin } from "../../../../lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 1_024)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "application-cancel", identifier: auth.user.id, limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const applicationId = (await params).id, row = await findApplication(applicationId, auth.user.id);
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!["submitted", "under_review", "waiting"].includes(row.status)) return Response.json({ error: "CANNOT_CANCEL" }, { status: 409 });
  const updated = await cancelApplication(applicationId, auth.user.id, ["submitted", "under_review", "waiting"]);
  if (!updated.length) return Response.json({ error: "APPLICATION_CONFLICT" }, { status: 409 });
  return Response.json({ ok: true, status: "cancelled" });
}
