import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { posts } from "../../../db/schema";
import { hasPersonalDataPattern, id, requireUser, sameOrigin, sanitizeText } from "../../lib/security";

export async function GET() {
  const rows = await getDb().select({
    id: posts.id, authorAlias: posts.authorAlias, category: posts.category, clubId: posts.clubId,
    title: posts.title, content: posts.content, isNotice: posts.isNotice,
    createdAt: posts.createdAt, updatedAt: posts.updatedAt,
  }).from(posts).where(and(eq(posts.isHidden, false), isNull(posts.deletedAt))).orderBy(sql`${posts.isNotice} desc, ${posts.createdAt} desc`).limit(100);
  return Response.json({ posts: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json();
  const title = sanitizeText(body.title, 120);
  const content = sanitizeText(body.content, 5000);
  const category = sanitizeText(body.category, 30) || "자유";
  const clubId = sanitizeText(body.clubId, 80) || null;
  if (!title || !content) return Response.json({ error: "REQUIRED_FIELDS" }, { status: 400 });
  if (hasPersonalDataPattern(`${title} ${content}`)) return Response.json({ error: "PERSONAL_DATA_DETECTED" }, { status: 422 });
  const now = new Date();
  const post = { id: id("post"), authorUserId: auth.user.id, authorAlias: auth.user.alias, category, clubId, title, content, isNotice: auth.user.role !== "student" && Boolean(body.isNotice), isHidden: false, createdAt: now, updatedAt: now };
  await getDb().insert(posts).values(post);
  return Response.json({ post: { ...post, authorUserId: undefined } }, { status: 201 });
}
