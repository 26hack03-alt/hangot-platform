import { findClub } from "../../lib/clubs";
import { ensureClub } from "../../lib/database/clubs";
import { addClubFavorite, listFavoriteClubIds } from "../../lib/database/favorites";
import { checkRateLimit, hasOversizedBody } from "../../lib/rate-limit";
import { requireUser, sameOrigin, sanitizeText } from "../../lib/security";

export async function GET(){const auth=await requireUser();if("error" in auth)return auth.error;return Response.json({favorites:await listFavoriteClubIds(auth.user.id)})}

export async function POST(request:Request){const auth=await requireUser();if("error" in auth)return auth.error;if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});if(hasOversizedBody(request,2_048))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});const limited=await checkRateLimit(request,{scope:"club-favorite-add",identifier:auth.user.id,limit:30,windowMs:60_000});if(limited)return limited;const body=await request.json().catch(()=>null),clubId=sanitizeText(body?.clubId,80),club=findClub(clubId);if(!club)return Response.json({error:"CLUB_NOT_FOUND"},{status:404});const now=new Date().toISOString();await ensureClub({id:club.club_id,name:club.club_name,category:club.category,field:club.career,description:club.introduction,activity_details:club.activities,capacity:20,recruitment_status:club.recruitment_status,is_active:true,created_at:now,updated_at:now});await addClubFavorite(auth.user.id,club.club_id);return Response.json({clubId:club.club_id,favorite:true},{status:201})}
