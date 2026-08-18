import { clubName } from "../../../lib/clubs";
import { listAdminQuestions } from "../../../lib/database/questions";
import { requireUser,sanitizeText } from "../../../lib/security";

const validStatuses=new Set(["waiting","answered","closed"]),validPrivacy=new Set(["public","private"]),validPeriods=new Set(["today","7d","30d"]);
const camel=(row:Awaited<ReturnType<typeof listAdminQuestions>>[number])=>({id:row.id,clubId:row.club_id,clubName:clubName(row.club_id),author:"익명",title:row.title,content:row.content,isPrivate:row.is_private,isDeleted:Boolean(row.deleted_at),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at});

export async function GET(request:Request){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 const params=new URL(request.url).searchParams,search=sanitizeText(params.get("search"),120).toLocaleLowerCase("ko-KR"),clubId=sanitizeText(params.get("clubId"),80),status=params.get("status")??"",privacy=params.get("privacy")??"",period=params.get("period")??"",deleted=params.get("deleted")??"",page=positive(params.get("page"),1),pageSize=Math.min(100,positive(params.get("pageSize"),20));
 if(status&&!validStatuses.has(status))return Response.json({error:"INVALID_STATUS"},{status:400});if(privacy&&!validPrivacy.has(privacy))return Response.json({error:"INVALID_PRIVACY"},{status:400});if(period&&!validPeriods.has(period))return Response.json({error:"INVALID_PERIOD"},{status:400});if(deleted&&!['deleted'].includes(deleted))return Response.json({error:"INVALID_DELETED_FILTER"},{status:400});
 const all=await listAdminQuestions(),active=all.filter(row=>!row.deleted_at),cutoff=periodCutoff(period),filtered=all.filter(row=>(deleted?Boolean(row.deleted_at):!row.deleted_at)&&(!search||`${row.title} ${row.content} ${clubName(row.club_id)}`.toLocaleLowerCase("ko-KR").includes(search))&&(!clubId||row.club_id===clubId)&&(!status||row.status===status)&&(!privacy||(privacy==="private")===row.is_private)&&(!cutoff||new Date(row.created_at)>=cutoff));
 filtered.sort((a,b)=>(a.status==="waiting"?0:1)-(b.status==="waiting"?0:1)||Date.parse(b.created_at)-Date.parse(a.created_at));
 const statusCounts={waiting:0,answered:0,closed:0};for(const row of active)statusCounts[row.status]++;
 const start=(page-1)*pageSize;return Response.json({questions:filtered.slice(start,start+pageSize).map(camel),pagination:{page,pageSize,total:filtered.length,totalPages:Math.max(1,Math.ceil(filtered.length/pageSize))},summary:{total:active.length,statusCounts,privateCount:active.filter(row=>row.is_private).length,deletedCount:all.length-active.length}});
}
function positive(value:string|null,fallback:number){const parsed=Number.parseInt(value??"",10);return Number.isFinite(parsed)&&parsed>0?parsed:fallback}
function periodCutoff(period:string){const now=new Date();if(period==="today")return new Date(now.getFullYear(),now.getMonth(),now.getDate());if(period==="7d")return new Date(now.getTime()-7*86_400_000);if(period==="30d")return new Date(now.getTime()-30*86_400_000);return null}
