import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applications } from "../../../../db/schema";
import { clubName } from "../../../lib/clubs";
import { requireUser } from "../../../lib/security";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const rows = await getDb().select({
    id: applications.id,
    applicationNumber: applications.publicId,
    clubId: applications.clubId,
    status: applications.status,
    submittedAt: applications.submittedAt,
    updatedAt: applications.updatedAt,
    cancelledAt: applications.cancelledAt,
  }).from(applications).where(eq(applications.userId, auth.user.id)).orderBy(desc(applications.submittedAt));
  return Response.json({ applications: rows.map((row) => ({ ...row, clubName: clubName(row.clubId) })) });
}
