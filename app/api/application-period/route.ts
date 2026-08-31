import { applicationPeriodSnapshot } from "../../lib/database/application-settings";

export async function GET() {
  return Response.json(await applicationPeriodSnapshot(), { headers:{ "cache-control":"no-store" } });
}
