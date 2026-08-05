import { asc, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { requireUser } from "../../../lib/security";

export async function GET() {
  const auth = await requireUser(["admin"]); if ("error" in auth) return auth.error;
  const rows = await getDb().select({ id:users.id, alias:users.alias, role:users.role, isActive:users.isActive, updatedAt:users.updatedAt }).from(users).where(inArray(users.role,["student","club_manager"])).orderBy(asc(users.alias));
  return Response.json({ users: rows.map(row=>({...row,role:row.role==="club_manager"?"teacher":"student"})) });
}
