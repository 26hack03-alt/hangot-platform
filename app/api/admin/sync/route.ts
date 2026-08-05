import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { syncJobs } from "../../../../db/schema";
import { requireUser, sameOrigin } from "../../../lib/security";
import { upsertSheetRow } from "../../../lib/sheets";

export async function GET() {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  const jobs = await getDb().select().from(syncJobs).orderBy(sql`${syncJobs.createdAt} desc`).limit(100);
  return Response.json({ jobs });
}

export async function POST(request: Request) {
  const auth = await requireUser(["admin"]);
  if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const jobs = await getDb().select().from(syncJobs).where(sql`${syncJobs.status} IN ('pending','failed')`).limit(50);
  let succeeded = 0;
  for (const job of jobs) {
    try {
      const data = JSON.parse(job.payload) as Record<string, unknown>;
      if (job.dataType === "application") {
        await upsertSheetRow(process.env.GOOGLE_SHEETS_APPLICATION_SHEET || "신청현황", job.sourceId, [
          job.sourceId, String(data.alias ?? ""), String(data.submittedAt ?? data.updatedAt ?? ""), String(data.updatedAt ?? ""),
          String(data.clubId ?? ""), String(data.clubName ?? ""), String(data.status ?? ""), String(data.motivation ?? ""),
          String(data.careerInterest ?? ""), String(data.experience ?? ""), String(data.additionalAnswer ?? ""), "", "", new Date().toISOString(),
        ]);
      } else if (job.dataType === "question") {
        await upsertSheetRow(process.env.GOOGLE_SHEETS_QUESTION_SHEET || "질문현황", job.sourceId, [
          job.sourceId, String(data.authorAlias ?? ""), String(data.createdAt ?? ""), String(data.clubId ?? ""),
          data.isPrivate ? "비공개" : "공개", String(data.status ?? ""), "", "",
        ]);
      }
      await getDb().update(syncJobs).set({ status: "succeeded", resolvedAt: new Date(), lastError: null, updatedAt: new Date() }).where(eq(syncJobs.id, job.id));
      succeeded++;
    } catch (error) {
      await getDb().update(syncJobs).set({ status: "failed", retryCount: job.retryCount + 1, lastError: error instanceof Error ? error.message.slice(0, 300) : "Unknown sync error", updatedAt: new Date() }).where(eq(syncJobs.id, job.id));
    }
  }
  return Response.json({ processed: jobs.length, succeeded, failed: jobs.length - succeeded });
}
