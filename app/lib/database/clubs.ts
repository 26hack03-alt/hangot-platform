import "server-only";
import { databaseRequest, query } from "./client";
export type ClubRow={id:string;name:string;category:string;field:string|null;description:string;activity_details:string;capacity:number;recruitment_status:string;application_start_at:string|null;application_end_at:string|null;is_active:boolean};
export async function ensureClub(row:Record<string,unknown>){await databaseRequest("clubs?on_conflict=id",{method:"POST",headers:{prefer:"resolution=ignore-duplicates"},body:JSON.stringify(row)})}
export async function findDatabaseClub(id:string){const rows=await databaseRequest<ClubRow[]>(`clubs?${query({select:"*",id:`eq.${id}`,limit:1})}`);return rows[0]??null}
