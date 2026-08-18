import { writeAudit } from "../../../../lib/database/audit";
import { findAdminPost,updatePostModeration,type AdminPostRow } from "../../../../lib/database/posts";
import { checkRateLimit,hasOversizedBody } from "../../../../lib/rate-limit";
import { id,requireUser,sameOrigin } from "../../../../lib/security";

const allowedKeys=new Set(["isHidden","isNotice"]);

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403});
 if(hasOversizedBody(request,2_048))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});
 const limited=await checkRateLimit(request,{scope:"admin-post-moderation",identifier:auth.user.id,limit:40,windowMs:60_000});if(limited)return limited;
 const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"INVALID_BODY"},{status:400});
 const keys=Object.keys(body);if(keys.length===0||keys.some(key=>!allowedKeys.has(key)))return Response.json({error:"INVALID_FIELDS"},{status:400});
 if(("isHidden" in body&&typeof body.isHidden!=="boolean")||("isNotice" in body&&typeof body.isNotice!=="boolean"))return Response.json({error:"INVALID_VALUES"},{status:400});
 const postId=(await params).id,current=await findAdminPost(postId);if(!current)return Response.json({error:"NOT_FOUND"},{status:404});
 const changes:{is_hidden?:boolean;is_notice?:boolean;updated_at:string}={updated_at:new Date().toISOString()};
 if(typeof body.isHidden==="boolean"&&body.isHidden!==current.is_hidden)changes.is_hidden=body.isHidden;
 if(typeof body.isNotice==="boolean"&&body.isNotice!==current.is_notice)changes.is_notice=body.isNotice;
 if(changes.is_hidden===undefined&&changes.is_notice===undefined)return Response.json({post:camel(current)});
 const updated=await updatePostModeration(postId,changes);if(!updated)return Response.json({error:"NOT_FOUND"},{status:404});
 const now=new Date().toISOString(),audits=[];
 if(changes.is_hidden!==undefined)audits.push(writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:changes.is_hidden?"board.post_hidden":"board.post_unhidden",target_type:"post",target_id:postId,before_data:{isHidden:current.is_hidden},after_data:{isHidden:updated.is_hidden},created_at:now}));
 if(changes.is_notice!==undefined)audits.push(writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:changes.is_notice?"board.notice_enabled":"board.notice_disabled",target_type:"post",target_id:postId,before_data:{isNotice:current.is_notice},after_data:{isNotice:updated.is_notice},created_at:now}));
 await Promise.all(audits);return Response.json({post:camel(updated)});
}

const camel=(row:AdminPostRow)=>({id:row.id,author:"익명",category:row.category,clubId:row.club_id,title:row.title,content:row.content,isNotice:row.is_notice,isHidden:row.is_hidden,createdAt:row.created_at,updatedAt:row.updated_at});
