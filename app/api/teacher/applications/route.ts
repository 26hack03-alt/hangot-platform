import { countApplications, listApplications } from "../../../lib/database/applications";
import { teacherClubIds } from "../../../lib/database/teachers";
import { isApplicationStatus } from "../../../lib/application-admin";
import { clubName } from "../../../lib/clubs";
import { requireUser, sanitizeText } from "../../../lib/security";

export async function GET(request: Request) {
  const auth = await requireUser(["club_manager"]);
  if ("error" in auth) return auth.error;
  const params = new URL(request.url).searchParams, page = positive(params.get("page"), 1), pageSize = Math.min(100, positive(params.get("pageSize"), 20)), status = params.get("status") ?? "", clubId = sanitizeText(params.get("clubId"), 80), search = sanitizeText(params.get("search"), 200), sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  if (status && !isApplicationStatus(status)) return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  const assigned = await teacherClubIds(auth.user.id), clubs = clubId && assigned.includes(clubId) ? [clubId] : assigned;
  if (!clubs.length) return Response.json({ applications: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
  const options = { status: isApplicationStatus(status) ? status : undefined, search: search || undefined, page, pageSize, sort, clubIds: clubs } as const;
  const [rows, total] = await Promise.all([listApplications(options), countApplications(options)]);
  return Response.json({ applications: rows.map(row => ({ id: row.id, applicationNumber: row.application_number, studentName: row.users?.student_name ?? null, studentNumber: row.users?.student_number ?? null, userAlias: row.users?.alias ?? "", clubId: row.club_id, clubName: row.clubs?.name || clubName(row.club_id), status: row.status, submittedAt: row.submitted_at, updatedAt: row.updated_at, reviewedAt: row.reviewed_at })), pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}

function positive(value: string | null, fallback: number) { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
