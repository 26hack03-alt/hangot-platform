import "server-only";
import { databaseRequest, query } from "./client";
export async function upsertSyncJob(row:Record<string,unknown>){return databaseRequest("sync_jobs?on_conflict=data_type,source_id,operation",{method:"POST",headers:{prefer:"resolution=merge-duplicates"},body:JSON.stringify(row)})}
export async function listSyncJobs(statuses?:string[]){return databaseRequest<Array<Record<string,unknown>>>(`sync_jobs?${query({select:"*",status:statuses?`in.(${statuses.join(",")})`:undefined,order:"created_at.desc",limit:statuses?50:100})}`)}
export async function updateSyncJob(id:string,row:Record<string,unknown>){return databaseRequest(`sync_jobs?${query({id:`eq.${id}`})}`,{method:"PATCH",body:JSON.stringify(row)})}
