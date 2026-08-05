import "server-only";
import { databaseRequest, query } from "./client";
export async function listQuestions(userId?:string){const params:Record<string,string|number>={select:"id,author_alias,club_id,title,content,is_private,status,created_at",deleted_at:"is.null",order:"created_at.desc",limit:100};params.or=userId?`(is_private.eq.false,author_user_id.eq.${userId})`:"(is_private.eq.false)";return databaseRequest<Record<string,unknown>[]>(`questions?${query(params)}`)}
export async function createQuestion(row:Record<string,unknown>){return databaseRequest<Record<string,unknown>[]>("questions",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify(row)})}
