import { countActiveClubApplications, createApplication, findDuplicateApplication } from "../../lib/database/applications";
import { applicationPeriodSnapshot } from "../../lib/database/application-settings";
import { ensureClub, findDatabaseClub } from "../../lib/database/clubs";
import { applicationAvailability, findClub } from "../../lib/clubs";
import { applicationPeriodError } from "../../lib/application-period";
import { checkRateLimit, hasOversizedBody } from "../../lib/rate-limit";
import { hasPersonalDataPattern, id, requireUser, sameOrigin, sanitizeText, shortCode } from "../../lib/security";

export async function POST(request: Request) {
  const auth = await requireUser(["student"]);
  if ("error" in auth) return auth.error;
  if (!auth.user.profileCompleted || !auth.user.studentName || !auth.user.studentNumber || !auth.user.schoolYear || !auth.user.privacyConsentAt) return Response.json({ error: "PROFILE_REQUIRED" }, { status: 409 });
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 32_768)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "application-create", identifier: auth.user.id, limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const clubId = sanitizeText(body.clubId, 80), sourceClub = findClub(clubId);
  if (!sourceClub) return Response.json({ error: "CLUB_NOT_FOUND" }, { status: 404 });
  if (body.confirmed !== true) return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  if (!valid(body.motivation, 20, 1000, true) || !valid(body.interestArea, 0, 300) || !valid(body.careerInterest, 0, 300) || !valid(body.experience, 0, 1000) || !valid(body.additionalMessage, 0, 500)) return Response.json({ error: "INVALID_FIELDS" }, { status: 400 });
  const availability = applicationAvailability(sourceClub.recruitment_status);
  if (availability !== "open") return Response.json({ error: availability === "inquiry" ? "INQUIRY_ONLY" : "RECRUITMENT_CLOSED" }, { status: 409 });
  const motivation = sanitizeText(body.motivation, 1000), interestArea = sanitizeText(body.interestArea, 300), careerInterest = sanitizeText(body.careerInterest, 300), experience = sanitizeText(body.experience, 1000), additionalMessage = sanitizeText(body.additionalMessage, 500);
  if (hasPersonalDataPattern([motivation, interestArea, careerInterest, experience, additionalMessage].join(" "))) return Response.json({ error: "PERSONAL_DATA_DETECTED" }, { status: 422 });
  if (await findDuplicateApplication(auth.user.id, clubId)) return Response.json({ error: "DUPLICATE_APPLICATION" }, { status: 409 });
  const now = new Date();
  await ensureClub({ id: clubId, name: sourceClub.club_name, category: sourceClub.category, field: sourceClub.career, description: sourceClub.introduction, activity_details: sourceClub.activities, capacity: 20, recruitment_status: "open", is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() });
  const club = await findDatabaseClub(clubId);
  if (!club || !club.is_active || club.recruitment_status !== "open") return Response.json({ error: "RECRUITMENT_CLOSED" }, { status: 409 });
  if ((club.application_start_at && new Date(club.application_start_at) > now) || (club.application_end_at && new Date(club.application_end_at) < now)) return Response.json({ error: "OUTSIDE_APPLICATION_PERIOD" }, { status: 409 });
  if (await countActiveClubApplications(clubId) >= club.capacity) return Response.json({ error: "CAPACITY_FULL" }, { status: 409 });
  const globalPeriod = await applicationPeriodSnapshot();
  const periodError = applicationPeriodError(globalPeriod.status);
  if (periodError) return Response.json({ error: periodError }, { status: 409 });
  const applicationId = id("app"), applicationNumber = shortCode("APP", 6), timestamp = now.toISOString();
  try {
    await createApplication({ id: applicationId, application_number: applicationNumber, user_id: auth.user.id, club_id: clubId, status: "submitted", motivation, interest_area: interestArea, career_interest: careerInterest, experience, additional_answer: additionalMessage, submitted_at: timestamp, updated_at: timestamp });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_APPLICATION") return Response.json({ error: "DUPLICATE_APPLICATION" }, { status: 409 });
    throw error;
  }
  return Response.json({ application: { id: applicationId, applicationNumber, clubId, clubName: sourceClub.club_name, status: "submitted", submittedAt: now } }, { status: 201 });
}

function valid(value: unknown, min: number, max: number, required = false) {
  if (value === undefined || value === null || value === "") return !required;
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}
