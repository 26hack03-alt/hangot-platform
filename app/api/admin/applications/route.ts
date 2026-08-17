import { applicationStatusCounts, countApplications, listApplications, sanitizeApplicationSearch } from "../../../lib/database/applications";
import { findApplicationUserIds } from "../../../lib/database/users";
import { applicationStatuses, isApplicationStatus } from "../../../lib/application-admin";
import { clubName } from "../../../lib/clubs";
import { requireUser, sanitizeText } from "../../../lib/security";

export async function GET(request: Request) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const params = new URL(request.url).searchParams, page = positive(params.get("page"), 1), pageSize = Math.min(100, positive(params.get("pageSize"), 20)), status = params.get("status")?.trim() ?? "", clubId = sanitizeText(params.get("clubId"), 80), search = sanitizeApplicationSearch(params.get("search") ?? ""), sort = params.get("sort") === "oldest" ? "oldest" : "newest", startDate=dateBoundary(params.get("startDate"),false), endDate=dateBoundary(params.get("endDate"),true);
  if (status && !isApplicationStatus(status)) return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  const searchUserIds = search ? await findApplicationUserIds(search) : [];
  const options = { status: isApplicationStatus(status) ? status : undefined, clubId: clubId || undefined, search: search || undefined, searchUserIds, startDate, endDate, page, pageSize, sort } as const;
  const [rows, total, counts] = await Promise.all([listApplications(options), countApplications(options), applicationStatusCounts()]), statusCounts = Object.fromEntries(applicationStatuses.map(value => [value, counts[value] ?? 0]));
  return Response.json({ applications: rows.map(row => ({ id: row.id, applicationNumber: row.application_number, studentName: row.users?.student_name ?? null, studentNumber: row.users?.student_number ?? null, userAlias: row.users?.alias ?? "", clubId: row.club_id, clubName: row.clubs?.name || clubName(row.club_id), status: row.status, submittedAt: row.submitted_at, updatedAt: row.updated_at, reviewedAt: row.reviewed_at })), pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }, summary: { total: Object.values(statusCounts).reduce((sum, value) => sum + value, 0), statusCounts } });
}

function positive(value: string | null, fallback: number) { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function dateBoundary(value:string|null,end:boolean){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;return new Date(`${value}T${end?"23:59:59.999":"00:00:00.000"}+09:00`).toISOString()}
