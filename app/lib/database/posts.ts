import "server-only";
import { databaseRequest, query } from "./client";
export async function listPosts(){return databaseRequest<Record<string,unknown>[]>(`posts?${query({select:"id,author_alias,category,club_id,title,content,is_notice,created_at,updated_at",is_hidden:"eq.false",deleted_at:"is.null",order:"is_notice.desc,created_at.desc",limit:100})}`)}
export async function createPost(row:Record<string,unknown>){return databaseRequest<Record<string,unknown>[]>("posts",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify(row)})}
export type AdminPostRow={id:string;category:string;club_id:string|null;title:string;content:string;is_notice:boolean;is_hidden:boolean;created_at:string;updated_at:string};
const adminPostSelect="id,category,club_id,title,content,is_notice,is_hidden,created_at,updated_at";
export async function listAdminPosts(){return databaseRequest<AdminPostRow[]>(`posts?${query({select:adminPostSelect,deleted_at:"is.null",order:"created_at.desc",limit:500})}`)}
export async function findAdminPost(postId:string){const rows=await databaseRequest<AdminPostRow[]>(`posts?${query({select:adminPostSelect,id:`eq.${postId}`,deleted_at:"is.null",limit:1})}`);return rows[0]??null}
export async function updatePostModeration(postId:string,changes:{is_hidden?:boolean;is_notice?:boolean;updated_at:string}){const rows=await databaseRequest<AdminPostRow[]>(`posts?${query({id:`eq.${postId}`,deleted_at:"is.null"})}`,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify(changes)});return rows[0]??null}
