import { type AppUser, updateOwnStudentProfile } from "../../lib/database/users";
import { checkRateLimit, hasOversizedBody } from "../../lib/rate-limit";
import { requireUser, sameOrigin, sanitizeText } from "../../lib/security";

export const PRIVACY_CONSENT_VERSION = "student-profile-2026-08-07";
const DEFAULT_SCHOOL_YEAR = 2026;

function profile(user: AppUser) {
  return {
    studentName: user.studentName,
    studentNumber: user.studentNumber,
    schoolYear: user.schoolYear,
    profileCompleted: user.profileCompleted,
    privacyConsentAt: user.privacyConsentAt?.toISOString() ?? null,
    privacyConsentVersion: user.privacyConsentVersion,
  };
}

function clean(value: unknown, maxLength: number) {
  return sanitizeText(value, maxLength).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return Response.json({ profile: profile(auth.user) });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 8_192)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "profile-update", identifier: auth.user.id, limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  if (body.privacyConsent !== true) return Response.json({ error: "PRIVACY_CONSENT_REQUIRED" }, { status: 400 });

  const studentName = clean(body.studentName, 20).replace(/\s+/g, " ");
  const studentNumber = clean(body.studentNumber, 12);
  const schoolYear = body.schoolYear === undefined || body.schoolYear === "" ? DEFAULT_SCHOOL_YEAR : Number(body.schoolYear);
  if (studentName.length < 2 || studentName.length > 20 || !/^[가-힣A-Za-z ]+$/u.test(studentName)) return Response.json({ error: "INVALID_STUDENT_NAME" }, { status: 400 });
  if (!/^\d{4,12}$/.test(studentNumber)) return Response.json({ error: "INVALID_STUDENT_NUMBER" }, { status: 400 });
  if (!Number.isInteger(schoolYear) || schoolYear < 2020 || schoolYear > 2100) return Response.json({ error: "INVALID_SCHOOL_YEAR" }, { status: 400 });

  try {
    const updated = await updateOwnStudentProfile(auth.user.id, { studentName, studentNumber, schoolYear, privacyConsentAt: new Date(), privacyConsentVersion: PRIVACY_CONSENT_VERSION });
    if (!updated) return Response.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    return Response.json({ profile: profile(updated) });
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NUMBER_ALREADY_USED") return Response.json({ error: "STUDENT_NUMBER_ALREADY_USED" }, { status: 409 });
    return Response.json({ error: "PROFILE_UPDATE_FAILED" }, { status: 500 });
  }
}
