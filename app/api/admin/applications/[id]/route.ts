import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { applications, clubs, users } from "../../../../../db/schema";
import { clubName } from "../../../../lib/clubs";
import { requireUser } from "../../../../lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const applicationId = (await params).id;
  const rows = await getDb().select({
    id: applications.id,
    applicationNumber: applications.publicId,
    userAlias: users.alias,
    clubId: applications.clubId,
    databaseClubName: clubs.name,
    status: applications.status,
    motivation: applications.motivation,
    interestArea: applications.interestArea,
    careerInterest: applications.careerInterest,
    experience: applications.experience,
    additionalMessage: applications.additionalAnswer,
    submittedAt: applications.submittedAt,
    updatedAt: applications.updatedAt,
    cancelledAt: applications.cancelledAt,
    reviewedAt: applications.reviewedAt,
    reviewComment: applications.reviewComment,
  }).from(applications).innerJoin(users, eq(applications.userId, users.id)).leftJoin(clubs, eq(applications.clubId, clubs.id)).where(eq(applications.id, applicationId)).limit(1);
  const row = rows[0];
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const { databaseClubName, ...application } = row;
  return Response.json({ application: { ...application, clubName: databaseClubName || clubName(row.clubId) } });
}
