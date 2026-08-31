import { writeAudit } from "../../../../../lib/database/audit";
import { demoteClubManager,findUserById,updateUserRole } from "../../../../../lib/database/users";
import { checkRateLimit,hasOversizedBody } from "../../../../../lib/rate-limit";
import { id,requireUser,sameOrigin } from "../../../../../lib/security";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});if(hasOversizedBody(request,1_024))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});
 const limited=await checkRateLimit(request,{scope:"admin-user-role",identifier:auth.user.id,limit:30,windowMs:60_000});if(limited)return limited;
 const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==1||!["student","teacher"].includes(body.role))return Response.json({error:"INVALID_ROLE"},{status:400});
 const userId=(await params).id,target=await findUserById(userId);if(!target)return Response.json({error:"NOT_FOUND"},{status:404});if(target.role==="admin")return Response.json({error:"ADMIN_ROLE_PROTECTED"},{status:409});const now=new Date().toISOString();
 if(body.role==="student"){const result=await demoteClubManager({targetUserId:userId,actorUserId:auth.user.id,auditId:id("audit"),now});return Response.json({user:{id:userId,alias:target.alias,role:"student",isActive:target.isActive},assignmentCountRemoved:result.removedCount})}
 await updateUserRole(userId,"club_manager");await writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:"teacher.role_changed",target_type:"user",target_id:userId,before_data:{role:target.role},after_data:{role:"club_manager"},created_at:now});return Response.json({user:{id:userId,alias:target.alias,role:"teacher",isActive:target.isActive}});
}
