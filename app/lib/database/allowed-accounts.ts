import "server-only";
import { DatabaseError,databaseRequest,query } from "./client";

export type AllowedAccountRow={id:string;normalized_email:string;reserved_role:"club_manager"|"admin";is_active:boolean;used_at:string|null;created_by:string;created_at:string;updated_at:string;linked_user_id:string|null;expires_at:string|null};

export async function listAllowedAccounts(){return databaseRequest<AllowedAccountRow[]>(`allowed_accounts?${query({select:"*",order:"created_at.desc"})}`)}
export async function createAllowedAccount(row:Record<string,unknown>){return databaseRequest<AllowedAccountRow[]>("allowed_accounts",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify(row)})}
export async function deactivateAllowedAccount(accountId:string,updatedAt:string){const rows=await databaseRequest<AllowedAccountRow[]>(`allowed_accounts?${query({id:`eq.${accountId}`,used_at:"is.null",is_active:"eq.true",select:"*"})}`,{method:"PATCH",headers:{prefer:"return=representation"},body:JSON.stringify({is_active:false,updated_at:updatedAt})});return rows[0]??null}
export async function claimAllowedAccount(input:{email:string;authUserId:string;userId:string;alias:string;recoveryHash:string;now:string}){try{await databaseRequest("rpc/claim_allowed_account",{method:"POST",body:JSON.stringify({p_normalized_email:input.email,p_auth_user_id:input.authUserId,p_user_id:input.userId,p_alias:input.alias,p_recovery_hash:input.recoveryHash,p_now:input.now})});return true}catch(error){if(error instanceof DatabaseError&&error.code==="P0002")return false;throw error}}
