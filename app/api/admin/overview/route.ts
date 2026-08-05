import { sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { applications, posts, questions, syncJobs, users } from "../../../../db/schema";
import { requireUser } from "../../../lib/security";

export async function GET() {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const db = getDb();
  const [userCount, applicationCount, postCount, questionCount, syncErrors] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(applications),
    db.select({ count: sql<number>`count(*)` }).from(posts),
    db.select({ count: sql<number>`count(*)` }).from(questions),
    db.select({ count: sql<number>`count(*)` }).from(syncJobs).where(sql`${syncJobs.status} = 'failed'`),
  ]);
  return Response.json({ stats: {
    users: Number(userCount[0]?.count ?? 0), applications: Number(applicationCount[0]?.count ?? 0),
    posts: Number(postCount[0]?.count ?? 0), questions: Number(questionCount[0]?.count ?? 0),
    syncErrors: Number(syncErrors[0]?.count ?? 0),
  } });
}
