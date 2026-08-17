import { findClub } from "../../../lib/clubs";
import { removeClubFavorite } from "../../../lib/database/favorites";
import { checkRateLimit } from "../../../lib/rate-limit";
import { requireUser, sameOrigin } from "../../../lib/security";

export async function DELETE(request:Request,{params}:{params:Promise<{clubId:string}>}){const auth=await requireUser();if("error" in auth)return auth.error;if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});const limited=await checkRateLimit(request,{scope:"club-favorite-remove",identifier:auth.user.id,limit:30,windowMs:60_000});if(limited)return limited;const clubId=(await params).clubId;if(!findClub(clubId))return Response.json({error:"CLUB_NOT_FOUND"},{status:404});await removeClubFavorite(auth.user.id,clubId);return Response.json({clubId,favorite:false})}
