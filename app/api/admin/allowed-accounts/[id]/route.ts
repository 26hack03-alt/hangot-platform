import { deactivateAllowedAccount } from "../../../../lib/database/allowed-accounts";
import { writeAudit } from "../../../../lib/database/audit";
import { checkRateLimit,hasOversizedBody } from "../../../../lib/rate-limit";
import { id,requireUser,sameOrigin } from "../../../../lib/security";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});if(hasOversizedBody(request,1_024))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});
 const limited=await checkRateLimit(request,{scope:"admin-allowed-account-deactivate",identifier:auth.user.id,limit:30,windowMs:60_000});if(limited)return limited;
 const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==1||body.isActive!==false)return Response.json({error:"INVALID_FIELDS"},{status:400});
 const accountId=(await params).id;if(!/^allow_[a-zA-Z0-9]+$/.test(accountId))return Response.json({error:"NOT_FOUND"},{status:404});const now=new Date().toISOString(),updated=await deactivateAllowedAccount(accountId,now);if(!updated)return Response.json({error:"APPROVAL_USED_OR_INACTIVE"},{status:409});
 await writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:"allowed_account.deactivated",target_type:"allowed_account",target_id:accountId,before_data:{isActive:true},after_data:{isActive:false},created_at:now});return Response.json({ok:true});
}
