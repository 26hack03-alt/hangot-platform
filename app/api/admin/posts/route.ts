import { listAdminPosts } from "../../../lib/database/posts";
import { requireUser,sanitizeText } from "../../../lib/security";

const camel=(row:Awaited<ReturnType<typeof listAdminPosts>>[number])=>({id:row.id,author:"익명",category:row.category,clubId:row.club_id,title:row.title,content:row.content,isNotice:row.is_notice,isHidden:row.is_hidden,createdAt:row.created_at,updatedAt:row.updated_at});

export async function GET(request:Request){
 const auth=await requireUser(["admin"]);if("error" in auth)return auth.error;
 const params=new URL(request.url).searchParams,search=sanitizeText(params.get("search"),120).toLocaleLowerCase("ko-KR"),category=sanitizeText(params.get("category"),30),status=params.get("status")??"",notice=params.get("notice")??"",page=positive(params.get("page"),1),pageSize=Math.min(100,positive(params.get("pageSize"),20));
 if(status&&!['public','hidden'].includes(status))return Response.json({error:"INVALID_STATUS"},{status:400});
 if(notice&&!['notice','regular'].includes(notice))return Response.json({error:"INVALID_NOTICE_FILTER"},{status:400});
 const all=await listAdminPosts(),categories=[...new Set(all.map(row=>row.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"));
 const filtered=all.filter(row=>(!search||`${row.title} ${row.content} ${row.category}`.toLocaleLowerCase("ko-KR").includes(search))&&(!category||row.category===category)&&(!status||(status==="hidden")===row.is_hidden)&&(!notice||(notice==="notice")===row.is_notice));
 const start=(page-1)*pageSize,posts=filtered.slice(start,start+pageSize).map(camel);
 return Response.json({posts,categories,pagination:{page,pageSize,total:filtered.length,totalPages:Math.max(1,Math.ceil(filtered.length/pageSize))},summary:{total:all.length}});
}

function positive(value:string|null,fallback:number){const parsed=Number.parseInt(value??"",10);return Number.isFinite(parsed)&&parsed>0?parsed:fallback}
