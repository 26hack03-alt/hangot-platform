import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { questions, syncJobs } from "../../../db/schema";
import { hasPersonalDataPattern, id, requireUser, sameOrigin, sanitizeText } from "../../lib/security";

export async function GET() {
  const auth = await requireUser();
  const user = "error" in auth ? null : auth.user;
  const publicOnly = and(eq(questions.isPrivate, false), isNull(questions.deletedAt));
  const condition = user ? and(isNull(questions.deletedAt), or(eq(questions.isPrivate, false), eq(questions.authorUserId, user.id))) : publicOnly;
  const rows = await getDb().select({
    id: questions.id, authorAlias: questions.authorAlias, clubId: questions.clubId,
    title: questions.title, content: questions.content, isPrivate: questions.isPrivate,
    status: questions.status, createdAt: questions.createdAt,
  }).from(questions).where(condition).orderBy(sql`${questions.createdAt} desc`).limit(100);
  return Response.json({ questions: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json();
  const clubId = sanitizeText(body.clubId, 80);
  const title = sanitizeText(body.title, 120);
  const content = sanitizeText(body.content, 3000);
  if (!clubId || !title || !content) return Response.json({ error: "REQUIRED_FIELDS" }, { status: 400 });
  if (hasPersonalDataPattern(`${title} ${content}`)) return Response.json({ error: "PERSONAL_DATA_DETECTED" }, { status: 422 });
  const now = new Date();
  const questionId = id("question");
  const question = { id: questionId, authorUserId: auth.user.id, authorAlias: auth.user.alias, clubId, title, content, isPrivate: Boolean(body.isPrivate), status: "waiting" as const, createdAt: now, updatedAt: now };
  await getDb().batch([
    getDb().insert(questions).values(question),
    getDb().insert(syncJobs).values({ id: id("sync"), dataType: "question", sourceId: questionId, operation: "upsert", payload: JSON.stringify({ questionId, authorAlias: auth.user.alias, clubId, title: question.isPrivate ? "" : title, isPrivate: question.isPrivate, status: "waiting", createdAt: now.toISOString() }), status: "pending", createdAt: now, updatedAt: now }),
  ]);
  return Response.json({ question: { ...question, authorUserId: undefined } }, { status: 201 });
}
