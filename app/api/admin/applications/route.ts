import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applications, clubs, users } from "../../../../db/schema";
import { applicationStatuses, isApplicationStatus } from "../../../lib/application-admin";
import { clubName } from "../../../lib/clubs";
import { requireUser, sanitizeText } from "../../../lib/security";

export async function GET(request: Request) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const params = new URL(request.url).searchParams;
  const page = positiveInteger(params.get("page"), 1);
  const pageSize = Math.min(100, positiveInteger(params.get("pageSize"), 20));
  const status = params.get("status")?.trim() ?? "";
  const clubId = sanitizeText(params.get("clubId"), 80);
  const search = sanitizeText(params.get("search"), 200);
  const sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  if (status && !isApplicationStatus(status)) return Response.json({ error: "INVALID_STATUS" }, { status: 400 });
  const statusFilter = isApplicationStatus(status) ? status : null;

  const filters: SQL[] = [];
  if (statusFilter) filters.push(eq(applications.status, statusFilter));
  if (clubId) filters.push(eq(applications.clubId, clubId));
  if (search) {
    const pattern = `%${search}%`;
    const searchFilter = or(like(applications.publicId, pattern), like(users.alias, pattern), like(clubs.name, pattern), like(applications.motivation, pattern));
    if (searchFilter) filters.push(searchFilter);
  }
  const where = filters.length ? and(...filters) : undefined;
  const db = getDb();
  const base = db.select({
    id: applications.id,
    applicationNumber: applications.publicId,
    userAlias: users.alias,
    clubId: applications.clubId,
    databaseClubName: clubs.name,
    status: applications.status,
    submittedAt: applications.submittedAt,
    updatedAt: applications.updatedAt,
    reviewedAt: applications.reviewedAt,
  }).from(applications).innerJoin(users, eq(applications.userId, users.id)).leftJoin(clubs, eq(applications.clubId, clubs.id));
  const countBase = db.select({ count: sql<number>`count(*)` }).from(applications).innerJoin(users, eq(applications.userId, users.id)).leftJoin(clubs, eq(applications.clubId, clubs.id));
  const [rows, countRows, statusRows] = await Promise.all([
    (where ? base.where(where) : base).orderBy(sort === "oldest" ? asc(applications.submittedAt) : desc(applications.submittedAt)).limit(pageSize).offset((page - 1) * pageSize),
    where ? countBase.where(where) : countBase,
    db.select({ status: applications.status, count: sql<number>`count(*)` }).from(applications).groupBy(applications.status),
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  const statusCounts = Object.fromEntries(applicationStatuses.map((item) => [item, 0]));
  for (const row of statusRows) statusCounts[row.status] = Number(row.count);
  return Response.json({
    applications: rows.map(({ databaseClubName, ...row }) => ({ ...row, clubName: databaseClubName || clubName(row.clubId) })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    summary: { total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0), statusCounts },
  });
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
