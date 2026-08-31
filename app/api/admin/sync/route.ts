import {listApplicationSheetSnapshot} from "../../../lib/database/applications";
import {writeAudit} from "../../../lib/database/audit";
import {listSyncJobs,updateSyncJob} from "../../../lib/database/sync";
import {checkRateLimit,hasOversizedBody} from "../../../lib/rate-limit";
import {id,requireUser,sameOrigin} from "../../../lib/security";
import {replaceApplicationSheet,SheetsError,upsertSheetRow} from "../../../lib/sheets";

const runtime=globalThis as typeof globalThis&{__hangotSheetsSyncRunning?:boolean};
const headers={"cache-control":"no-store"};

export async function GET(){
 const auth=await requireUser(["admin"]);if("error"in auth)return auth.error;
 const jobs=await listSyncJobs();
 return Response.json({jobs:jobs.map(job=>({id:job.id,dataType:job.data_type,operation:job.operation,status:job.status,attemptCount:job.retry_count,lastErrorCode:job.last_error,createdAt:job.created_at,processedAt:job.resolved_at}))},{headers});
}

export async function POST(request:Request){
 const auth=await requireUser(["admin"]);if("error"in auth)return auth.error;
 if(!sameOrigin(request))return Response.json({error:"INVALID_ORIGIN"},{status:403,headers});
 if(hasOversizedBody(request,1_024))return Response.json({error:"REQUEST_TOO_LARGE"},{status:413,headers});
 const limited=await checkRateLimit(request,{scope:"admin-google-sheets-sync",identifier:auth.user.id,limit:3,windowMs:60_000});if(limited)return limited;
 if((await request.text()).trim())return Response.json({error:"BODY_NOT_ALLOWED"},{status:400,headers});
 // This prevents duplicate work in one runtime. A DB advisory lock would be needed
 // for a strict guarantee across multiple production instances.
 if(runtime.__hangotSheetsSyncRunning)return Response.json({error:"SYNC_IN_PROGRESS"},{status:409,headers});
 runtime.__hangotSheetsSyncRunning=true;
 const syncedAt=new Date().toISOString();
 let stage="load_snapshot";
 try{
  const snapshot=await listApplicationSheetSnapshot(),seen=new Set<string>();
  const data=snapshot.sort((a,b)=>a.submitted_at.localeCompare(b.submitted_at)||a.id.localeCompare(b.id)).filter(row=>!seen.has(row.id)&&Boolean(seen.add(row.id)));
  const rows=[["application_id","application_number","club_id","club_name","status","submitted_at","updated_at","reviewed_at","cancelled_at","synced_at"],...data.map(row=>[row.id,row.application_number,row.club_id,row.clubs?.name??"",row.status,row.submitted_at,row.updated_at,row.reviewed_at??"",row.cancelled_at??"",syncedAt])];
  stage="write_sheet";await replaceApplicationSheet(rows);
  stage="sync_questions";
  const questionResult=await syncQuestions();
  stage="write_audit";
  await writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:"google_sheets.sync_completed",target_type:"google_sheets",target_id:"application_snapshot",after_data:{processedCount:data.length,succeeded:true,syncedAt,questionSucceeded:questionResult.succeeded,questionFailed:questionResult.failed},created_at:syncedAt});
  return Response.json({ok:true,processed:data.length,syncedAt,questionSync:questionResult},{headers});
 }catch(error){
  const code=error instanceof SheetsError?error.code:"SYNC_FAILED";
  const failureStage=error instanceof SheetsError?error.stage:stage,httpStatus=error instanceof SheetsError?error.httpStatus:undefined;
  console.error(`[google-sheets-sync] ${code} stage=${failureStage}${httpStatus?` httpStatus=${httpStatus}`:""}`);
  await writeAudit({id:id("audit"),actor_user_id:auth.user.id,actor_role:"admin",action_type:"google_sheets.sync_failed",target_type:"google_sheets",target_id:"application_snapshot",after_data:{succeeded:false,errorCode:code,syncedAt},created_at:new Date().toISOString()}).catch(()=>undefined);
  const status=code==="SHEETS_NOT_CONFIGURED"?503:code==="SHEETS_PERMISSION_DENIED"?502:500;
  return Response.json({error:code},{status,headers});
 }finally{runtime.__hangotSheetsSyncRunning=false}
}

async function syncQuestions(){
 const jobs=await listSyncJobs(["pending","failed"],"question");let succeeded=0,failed=0;
 for(const job of jobs){try{const data=(typeof job.payload==="string"?JSON.parse(job.payload):job.payload)as Record<string,unknown>;await upsertSheetRow(process.env.GOOGLE_SHEETS_QUESTION_SHEET||"질문현황",String(job.source_id),[String(job.source_id),String(data.authorAlias??""),String(data.createdAt??""),String(data.clubId??""),data.isPrivate?"비공개":"공개",String(data.status??""),"",""]);await updateSyncJob(String(job.id),{status:"succeeded",resolved_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()});succeeded++}catch(error){const code=error instanceof SheetsError?error.code:"QUESTION_SYNC_FAILED";await updateSyncJob(String(job.id),{status:"failed",retry_count:Number(job.retry_count??0)+1,last_error:code,updated_at:new Date().toISOString()});failed++}}
 return{succeeded,failed};
}
