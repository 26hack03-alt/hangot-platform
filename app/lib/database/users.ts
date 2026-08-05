import "server-only";
import { databaseRequest, query } from "./client";

export type AppUser = { id:string; authUserId:string; alias:string; recoveryHash:string; role:"student"|"club_manager"|"admin"; isActive:boolean; lastActiveAt:Date; createdAt:Date; updatedAt:Date };
type UserRow = { id:string; auth_user_id:string; alias:string; recovery_hash:string; role:AppUser["role"]; is_active:boolean; last_active_at:string; created_at:string; updated_at:string };
const map=(r:UserRow):AppUser=>({id:r.id,authUserId:r.auth_user_id,alias:r.alias,recoveryHash:r.recovery_hash,role:r.role,isActive:r.is_active,lastActiveAt:new Date(r.last_active_at),createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});

export async function findUserByAuthId(authUserId:string){const rows=await databaseRequest<UserRow[]>(`users?${query({select:"*",auth_user_id:`eq.${authUserId}`,limit:1})}`);return rows[0]?map(rows[0]):null}
export async function findUserById(id:string){const rows=await databaseRequest<UserRow[]>(`users?${query({select:"*",id:`eq.${id}`,limit:1})}`);return rows[0]?map(rows[0]):null}
export async function ensureUser(input:{id:string;authUserId:string;alias:string;recoveryHash:string;now:Date}){await databaseRequest("users?on_conflict=auth_user_id",{method:"POST",headers:{prefer:"resolution=ignore-duplicates"},body:JSON.stringify({id:input.id,auth_user_id:input.authUserId,alias:input.alias,recovery_hash:input.recoveryHash,role:"student",is_active:true,last_active_at:input.now.toISOString(),created_at:input.now.toISOString(),updated_at:input.now.toISOString()})});return findUserByAuthId(input.authUserId)}
export async function listTeacherCandidates(){return databaseRequest<Array<{id:string;alias:string;role:AppUser["role"];is_active:boolean;updated_at:string}>>(`users?${query({select:"id,alias,role,is_active,updated_at",role:"in.(student,club_manager)",order:"alias.asc"})}`)}
export async function updateUserRole(id:string,role:AppUser["role"]){return databaseRequest<UserRow[]>(`users?${query({id:`eq.${id}`,select:"*"})}`,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify({role,updated_at:new Date().toISOString()})})}
