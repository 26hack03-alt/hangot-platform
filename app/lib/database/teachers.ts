import "server-only";
import { databaseRequest, isUniqueViolation, query } from "./client";
export type AssignmentRow={id:string;teacher_user_id:string;club_id:string;created_at:string;created_by:string;users?:{alias:string}|null};
export async function teacherClubIds(teacherUserId:string){const rows=await databaseRequest<Array<{club_id:string}>>(`teacher_clubs?${query({select:"club_id",teacher_user_id:`eq.${teacherUserId}`})}`);return rows.map(r=>r.club_id)}
export async function listAssignments(){return databaseRequest<AssignmentRow[]>(`teacher_clubs?${query({select:"*,users!teacher_clubs_teacher_user_id_fkey(alias)",order:"created_at.asc"})}`)}
export async function findAssignment(id:string){const rows=await databaseRequest<AssignmentRow[]>(`teacher_clubs?${query({select:"*",id:`eq.${id}`,limit:1})}`);return rows[0]??null}
export async function createAssignment(row:Record<string,unknown>){try{return await databaseRequest<AssignmentRow[]>("teacher_clubs",{method:"POST",headers:{prefer:"return=representation"},body:JSON.stringify(row)})}catch(e){if(isUniqueViolation(e))throw new Error("DUPLICATE_ASSIGNMENT");throw e}}
export async function deleteAssignment(id:string){await databaseRequest(`teacher_clubs?${query({id:`eq.${id}`})}`,{method:"DELETE"})}
