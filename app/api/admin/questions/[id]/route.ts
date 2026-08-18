import { clubName } from "../../../../lib/clubs";
import { findAdminQuestion,findQuestionAnswer } from "../../../../lib/database/questions";
import { requireUser } from "../../../../lib/security";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;const question=await findAdminQuestion((await params).id);if(!question)return Response.json({error:"NOT_FOUND"},{status:404});const answer=await findQuestionAnswer(question.id);return Response.json({question:{id:question.id,clubId:question.club_id,clubName:clubName(question.club_id),author:"익명",title:question.title,content:question.content,isPrivate:question.is_private,status:question.status,createdAt:question.created_at,updatedAt:question.updated_at,answer:answer?{content:answer.content,role:answer.author_role==="admin"?"관리자 답변":"담당 교사 답변",createdAt:answer.created_at}:null}})}
