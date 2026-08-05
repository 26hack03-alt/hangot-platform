import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applications } from "../../../../db/schema";
import { clubName } from "../../../lib/clubs";
import { requireUser } from "../../../lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const applicationId = (await params).id;
  const row = await getDb().query.applications.findFirst({
    where: and(eq(applications.id, applicationId), eq(applications.userId, auth.user.id)),
  });
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ application: {
    applicationNumber: row.publicId,
    clubId: row.clubId,
    clubName: clubName(row.clubId),
    status: row.status,
    motivation: row.motivation,
    interestArea: row.interestArea ?? "",
    careerInterest: row.careerInterest,
    experience: row.experience,
    additionalMessage: row.additionalAnswer ?? "",
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    cancelledAt: row.cancelledAt,
    reviewedAt: row.reviewedAt,
    reviewComment: row.reviewComment,
  } });
}
