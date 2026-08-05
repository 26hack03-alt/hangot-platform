import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, clubs, syncJobs } from "../../../db/schema";
import { applicationAvailability, findClub } from "../../lib/clubs";
import { hasPersonalDataPattern, id, requireUser, sameOrigin, sanitizeText, shortCode } from "../../lib/security";

export async function POST(request: Request) {
  const auth = await requireUser(["student"]);
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const clubId = sanitizeText(body.clubId, 80);
  const sourceClub = findClub(clubId);
  if (!sourceClub) return Response.json({ error: "CLUB_NOT_FOUND" }, { status: 404 });
  if (body.confirmed !== true) return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  if (!validInput(body.motivation, 20, 1000, true)
    || !validInput(body.interestArea, 0, 300)
    || !validInput(body.careerInterest, 0, 300)
    || !validInput(body.experience, 0, 1000)
    || !validInput(body.additionalMessage, 0, 500)) {
    return Response.json({ error: "INVALID_FIELDS" }, { status: 400 });
  }
  if (applicationAvailability(sourceClub.recruitment_status) !== "open") {
    return Response.json({ error: applicationAvailability(sourceClub.recruitment_status) === "inquiry" ? "INQUIRY_ONLY" : "RECRUITMENT_CLOSED" }, { status: 409 });
  }
  const motivation = sanitizeText(body.motivation, 1000);
  const interestArea = sanitizeText(body.interestArea, 300);
  const careerInterest = sanitizeText(body.careerInterest, 300);
  const experience = sanitizeText(body.experience, 1000);
  const additionalMessage = sanitizeText(body.additionalMessage, 500);
  if (motivation.length < 20) return Response.json({ error: "INVALID_FIELDS" }, { status: 400 });
  if (hasPersonalDataPattern([motivation, interestArea, careerInterest, experience, additionalMessage].join(" "))) {
    return Response.json({ error: "PERSONAL_DATA_DETECTED" }, { status: 422 });
  }
  const db = getDb();
  const existing = await db.query.applications.findFirst({ where: and(eq(applications.userId, auth.user.id), eq(applications.clubId, clubId)) });
  if (existing) return Response.json({ error: "DUPLICATE_APPLICATION" }, { status: 409 });
  const now = new Date();
  await db.insert(clubs).values({
    id: clubId, name: sourceClub.club_name, category: sourceClub.category, field: sourceClub.career,
    description: sourceClub.introduction, activityDetails: sourceClub.activities, capacity: 20,
    recruitmentStatus: "open",
    isActive: true, createdAt: now, updatedAt: now,
  }).onConflictDoNothing();
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club || !club.isActive || club.recruitmentStatus !== "open") return Response.json({ error: "RECRUITMENT_CLOSED" }, { status: 409 });
  if ((club.applicationStartAt && club.applicationStartAt > now) || (club.applicationEndAt && club.applicationEndAt < now)) {
    return Response.json({ error: "OUTSIDE_APPLICATION_PERIOD" }, { status: 409 });
  }
  const count = await db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.clubId, clubId), ne(applications.status, "cancelled")));
  if (Number(count[0]?.count ?? 0) >= club.capacity) return Response.json({ error: "CAPACITY_FULL" }, { status: 409 });
  const applicationId = id("app");
  const applicationNumber = shortCode("APP", 6);
  try {
    await db.batch([
      db.insert(applications).values({ id: applicationId, publicId: applicationNumber, userId: auth.user.id, clubId, status: "submitted", motivation, interestArea, careerInterest, experience, additionalAnswer: additionalMessage, submittedAt: now, updatedAt: now }),
      db.insert(syncJobs).values({ id: id("sync"), dataType: "application", sourceId: applicationId, operation: "upsert", payload: JSON.stringify({ applicationNumber, alias: auth.user.alias, clubId, clubName: sourceClub.club_name, status: "submitted", motivation, interestArea, careerInterest, experience, additionalMessage, submittedAt: now.toISOString() }), status: "pending", createdAt: now, updatedAt: now }),
    ]);
  } catch (error) {
    if (isDuplicateApplicationError(error)) {
      return Response.json({ error: "DUPLICATE_APPLICATION" }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ application: { id: applicationId, applicationNumber, clubId, clubName: sourceClub.club_name, status: "submitted", submittedAt: now } }, { status: 201 });
}

function validInput(value: unknown, min: number, max: number, required = false) {
  if (value === undefined || value === null || value === "") return !required;
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function isDuplicateApplicationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed:\s*applications\.user_id,\s*applications\.club_id/i.test(message)
    || /application_user_club_unique/i.test(message);
}
