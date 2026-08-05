import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, users } from "../../../../../../db/schema";
import { id, requireUser, sameOrigin } from "../../../../../lib/security";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});
 const body=await request.json().catch(()=>null);if(!body||!['student','teacher'].includes(body.role))return Response.json({error:"INVALID_ROLE"},{status:400});
 const userId=(await params).id;const db=getDb();const target=await db.query.users.findFirst({where:eq(users.id,userId)});if(!target)return Response.json({error:"NOT_FOUND"},{status:404});if(target.role==="admin")return Response.json({error:"ADMIN_ROLE_PROTECTED"},{status:409});
 const role=body.role==="teacher"?"club_manager":"student";const now=new Date();await db.update(users).set({role,updatedAt:now}).where(eq(users.id,userId));await db.insert(auditLogs).values({id:id("audit"),actorUserId:auth.user.id,actorRole:"admin",actionType:"teacher.role_changed",targetType:"user",targetId:userId,beforeData:JSON.stringify({role:target.role}),afterData:JSON.stringify({role}),createdAt:now});return Response.json({user:{id:userId,alias:target.alias,role:body.role,isActive:target.isActive}})
}
