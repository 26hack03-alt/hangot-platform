import { listTeacherCandidates } from "../../../lib/database/users";
import { requireUser } from "../../../lib/security";
export async function GET(){const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;const rows=await listTeacherCandidates();return Response.json({users:rows.map(r=>({id:r.id,alias:r.alias,role:r.role==="club_manager"?"teacher":"student",isActive:r.is_active,updatedAt:r.updated_at}))})}
