import { createAllowedAccount,listAllowedAccounts } from "../../../lib/database/allowed-accounts";
import { writeAudit } from "../../../lib/database/audit";
import { DatabaseError } from "../../../lib/database/client";
import { isSchoolGoogleEmail,normalizeGoogleEmail,validApprovalEmail } from "../../../lib/login-policy";
import { checkRateLimit,hasOversizedBody } from "../../../lib/rate-limit";
import { id,requireUser,sameOrigin } from "../../../lib/security";

const roles=new Set(["club_manager","admin"]),allowedKeys=new Set(["email","reservedRole","expiresAt"]);
const camel=(row:Awaited<ReturnType<typeof listAllowedAccounts>>[number])=>({id:row.id,email:row.normalized_email,reservedRole:row.reserved_role,isActive:row.is_active,usedAt:row.used_at,createdAt:row.created_at,expiresAt:row.expires_at,linkedUserId:row.linked_user_id});

export async function GET(){const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;return Response.json({accounts:(await listAllowedAccounts()).map(camel)},{headers:{"cache-control":"no-store"}})}

export async function POST(request:Request){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});if(hasOversizedBody(request,2_048))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});
 const limited=await checkRateLimit(request,{scope:"admin-allowed-account-create",identifier:auth.user.id,limit:20,windowMs:60_000});if(limited)return limited;
 const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>!allowedKeys.has(key)))return Response.json({error:"INVALID_FIELDS"},{status:400});
 const email=normalizeGoogleEmail(body.email),reservedRole=typeof body.reservedRole==="string"?body.reservedRole:"",expiresAt=body.expiresAt===null||body.expiresAt===undefined||body.expiresAt===""?null:typeof body.expiresAt==="string"&&body.expiresAt.length<=40?new Date(body.expiresAt):null;
 if(typeof body.email!=="string"||body.email.length>254||!validApprovalEmail(email)||!roles.has(reservedRole)||isSchoolGoogleEmail(email,process.env.ALLOWED_GOOGLE_DOMAIN))return Response.json({error:"INVALID_FIELDS"},{status:400});
 if(body.expiresAt&&!expiresAt)return Response.json({error:"INVALID_EXPIRY"},{status:400});if(expiresAt&&(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date()))return Response.json({error:"INVALID_EXPIRY"},{status:400});
 const now=new Date().toISOString(),accountId=id("allow");
 try{const rows=await createAllowedAccount({id:accountId,normalized_email:email,reserved_role:reservedRole,is_active:true,used_at:null,created_by:auth.user.id,created_at:now,updated_at:now,linked_user_id:null,expires_at:expiresAt?.toISOString()??null});await writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:"allowed_account.created",target_type:"allowed_account",target_id:accountId,after_data:{reservedRole,hasExpiry:Boolean(expiresAt)},created_at:now});return Response.json({account:camel(rows[0])},{status:201})}catch(error){if(error instanceof DatabaseError&&error.code==="23505")return Response.json({error:"APPROVAL_ALREADY_EXISTS"},{status:409});throw error}
}
