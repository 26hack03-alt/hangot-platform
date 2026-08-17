import { applicationStatusCounts, listActionableApplications, listApplications, type ApplicationRow } from "../../../lib/database/applications";
import { tableCount } from "../../../lib/database/client";
import { findClub } from "../../../lib/clubs";
import { requireUser } from "../../../lib/security";

function gradeFromStudentNumber(studentNumber:string|null|undefined){const grade=studentNumber?.trim().charAt(0);return grade&&/^[1-3]$/.test(grade)?`${grade}학년`:"학년 미등록"}
function dashboardApplication(row:ApplicationRow){const club=findClub(row.club_id);return{id:row.id,studentName:row.users?.student_name??"학생 정보 미등록",studentGrade:gradeFromStudentNumber(row.users?.student_number),clubName:row.clubs?.name||club?.club_name||"알 수 없는 동아리",clubCategory:club?.category??"기타",status:row.status,submittedAt:row.submitted_at}}

export async function GET(){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 const[counts,actionable,recent,teachers,clubs,unansweredQuestions,syncErrors]=await Promise.all([applicationStatusCounts(),listActionableApplications(5),listApplications({page:1,pageSize:8,sort:"newest"}),tableCount("users","role=eq.club_manager&is_active=eq.true"),tableCount("clubs","is_active=eq.true"),tableCount("questions","status=eq.waiting&deleted_at=is.null"),tableCount("sync_jobs","status=eq.failed")]);
 const totalApplications=Object.values(counts).reduce((sum,value)=>sum+value,0);
 return Response.json({stats:{totalApplications,pendingReview:(counts.submitted??0)+(counts.under_review??0)+(counts.waiting??0),approved:counts.approved??0,rejected:counts.rejected??0,teachers,clubs,unansweredQuestions,syncErrors},actionable:actionable.map(dashboardApplication),recent:recent.map(dashboardApplication)});
}
