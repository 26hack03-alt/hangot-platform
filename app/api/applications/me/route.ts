import { listOwnApplications } from "../../../lib/database/applications";
import { requireUser } from "../../../lib/security";
export async function GET(){const auth=await requireUser();if("error" in auth)return auth.error;const rows=await listOwnApplications(auth.user.id);return Response.json({applications:rows.map(r=>({id:r.id,applicationNumber:r.application_number,clubId:r.club_id,status:r.status,submittedAt:r.submitted_at,updatedAt:r.updated_at,cancelledAt:r.cancelled_at}))})}
