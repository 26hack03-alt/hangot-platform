import { findApplication } from "../../../../lib/database/applications";
import { clubName } from "../../../../lib/clubs";
import { requireUser } from "../../../../lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const row = await findApplication((await params).id);
  if (!row) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ application: { id: row.id, applicationNumber: row.application_number, studentName: row.users?.student_name ?? null, studentNumber: row.users?.student_number ?? null, userAlias: row.users?.alias ?? "", clubId: row.club_id, clubName: row.clubs?.name || clubName(row.club_id), status: row.status, motivation: row.motivation, interestArea: row.interest_area, careerInterest: row.career_interest, experience: row.experience, additionalMessage: row.additional_answer, submittedAt: row.submitted_at, updatedAt: row.updated_at, cancelledAt: row.cancelled_at, reviewedAt: row.reviewed_at, reviewComment: row.review_comment } });
}
