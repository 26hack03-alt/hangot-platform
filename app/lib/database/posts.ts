import "server-only";
import { databaseRequest, query } from "./client";
export async function listPosts(){return databaseRequest<Record<string,unknown>[]>(`posts?${query({select:"id,author_alias,category,club_id,title,content,is_notice,created_at,updated_at",is_hidden:"eq.false",deleted_at:"is.null",order:"is_notice.desc,created_at.desc",limit:100})}`)}
export async function createPost(row:Record<string,unknown>){return databaseRequest<Record<string,unknown>[]>("posts",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify(row)})}
