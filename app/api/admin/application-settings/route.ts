import { applicationPeriodStatus } from "../../../lib/application-period";
import { applicationPeriodSnapshot, findApplicationSettings, saveApplicationSettings } from "../../../lib/database/application-settings";
import { writeAudit } from "../../../lib/database/audit";
import { checkRateLimit, hasOversizedBody } from "../../../lib/rate-limit";
import { id, requireUser, sameOrigin } from "../../../lib/security";

const allowedKeys = new Set(["startAt", "endAt"]), seoulDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+09:00$/;
function parseSeoulDateTime(value:string) { const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?\+09:00$/); if(!match)return null;const[,year,month,day,hour,minute,second="00"]=match,date=new Date(value),expected=Date.UTC(Number(year),Number(month)-1,Number(day),Number(hour)-9,Number(minute),Number(second));return Number.isFinite(date.getTime())&&date.getTime()===expected?date:null }

export async function GET() {
  const auth = await requireUser(["admin"]); if ("error" in auth) return auth.error;
  return Response.json(await applicationPeriodSnapshot(), { headers:{ "cache-control":"no-store" } });
}

export async function PATCH(request:Request) {
  const auth = await requireUser(["admin"]); if ("error" in auth) return auth.error;
  if (!sameOrigin(request)) return Response.json({ error:"INVALID_ORIGIN" }, { status:403 });
  if (hasOversizedBody(request, 2_048)) return Response.json({ error:"REQUEST_TOO_LARGE" }, { status:413 });
  const limited = await checkRateLimit(request, { scope:"admin-application-settings", identifier:auth.user.id, limit:20, windowMs:60_000 }); if (limited) return limited;
  const body = await request.json().catch(()=>null);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 2 || Object.keys(body).some(key=>!allowedKeys.has(key)) || typeof body.startAt !== "string" || typeof body.endAt !== "string" || body.startAt.length > 32 || body.endAt.length > 32 || !seoulDateTime.test(body.startAt) || !seoulDateTime.test(body.endAt)) return Response.json({ error:"INVALID_FIELDS" }, { status:400 });
  const start = parseSeoulDateTime(body.startAt), end = parseSeoulDateTime(body.endAt);
  if (!start || !end || end <= start) return Response.json({ error:"INVALID_APPLICATION_PERIOD" }, { status:400 });
  const before = await findApplicationSettings(), now = new Date().toISOString(), updated = await saveApplicationSettings({ startAt:start.toISOString(), endAt:end.toISOString(), updatedBy:auth.user.id, updatedAt:now });
  await writeAudit({ id:id("audit"), actor_user_id:auth.user.id, actor_role:"admin", action_type:"application_period.updated", target_type:"application_settings", target_id:updated.id, before_data:{ startAt:before?.application_start_at??null, endAt:before?.application_end_at??null }, after_data:{ startAt:updated.application_start_at, endAt:updated.application_end_at }, created_at:now });
  const settings={startAt:updated.application_start_at,endAt:updated.application_end_at};
  return Response.json({ ...settings, status:applicationPeriodStatus(settings), serverNow:new Date().toISOString() });
}
