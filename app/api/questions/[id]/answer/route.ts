import { answerQuestion, findQuestion } from "../../../../lib/database/questions";
import { teacherClubIds } from "../../../../lib/database/teachers";
import { checkRateLimit, hasOversizedBody } from "../../../../lib/rate-limit";
import { hasPersonalDataPattern, id, requireUser, sameOrigin, sanitizeText } from "../../../../lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin", "club_manager"]);
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (hasOversizedBody(request, 16_384)) return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  const limited = await checkRateLimit(request, { scope: "question-answer", identifier: auth.user.id, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const content = sanitizeText(body?.content, 5_000);
  if (!content) return Response.json({ error: "ANSWER_REQUIRED" }, { status: 400 });
  if (hasPersonalDataPattern(content)) return Response.json({ error: "PERSONAL_DATA_DETECTED" }, { status: 422 });

  const questionId = (await params).id;
  const question = await findQuestion(questionId);
  if (!question) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (auth.user.role === "club_manager" && !(await teacherClubIds(auth.user.id)).includes(question.club_id)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (question.status !== "waiting") return Response.json({ error: "QUESTION_ALREADY_ANSWERED" }, { status: 409 });

  const answerId = id("answer");
  try {
    await answerQuestion({ questionId, answerId, content, actorUserId: auth.user.id, actorRole: auth.user.role === "admin" ? "admin" : "teacher" });
  } catch {
    return Response.json({ error: "QUESTION_CONFLICT" }, { status: 409 });
  }
  return Response.json({ answer: { id: answerId, questionId }, question: { id: questionId, status: "answered" } }, { status: 201 });
}
