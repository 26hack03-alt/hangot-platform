"use client";

import { FormEvent,useCallback,useEffect,useState } from "react";
import PortalShell from "../../components/PortalShell";

type User={id:string;alias:string;role:"student"|"teacher";isActive:boolean};
type AllowedAccount={id:string;email:string;reservedRole:"club_manager"|"admin";isActive:boolean;usedAt:string|null;createdAt:string;expiresAt:string|null;linkedUserId:string|null};
const formatDate=(value:string)=>new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
const approvalStatus=(account:AllowedAccount)=>account.usedAt?"사용 완료":!account.isActive?"취소됨":account.expiresAt&&new Date(account.expiresAt)<=new Date()?"만료":"승인 대기";

export default function TeachersClient(){
 const[users,setUsers]=useState<User[]>([]),[accounts,setAccounts]=useState<AllowedAccount[]>([]),[form,setForm]=useState({email:"",reservedRole:"club_manager" as "club_manager"|"admin"}),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const load=useCallback(async()=>{const[usersResponse,accountsResponse]=await Promise.all([fetch("/api/admin/teachers",{cache:"no-store"}),fetch("/api/admin/allowed-accounts",{cache:"no-store"})]);if(usersResponse.ok)setUsers((await usersResponse.json()).users??[]);if(accountsResponse.ok)setAccounts((await accountsResponse.json()).accounts??[])},[]);
 useEffect(()=>{void load()},[load]);
 async function change(user:User){const role=user.role==="teacher"?"student":"teacher",response=await fetch(`/api/admin/users/${user.id}/role`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({role})}),result=await response.json().catch(()=>({}));setMessage(response.ok?role==="student"?`학생으로 변경하고 담당 배정 ${result.assignmentCountRemoved??0}건을 해제했습니다.`:"담당 교사로 지정했습니다.":"역할을 변경하지 못했습니다.");if(response.ok)await load()}
 async function approve(event:FormEvent){event.preventDefault();setSaving(true);setMessage("");try{const response=await fetch("/api/admin/allowed-accounts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,email:form.email.trim()})}),result=await response.json().catch(()=>({}));if(!response.ok){const errors:Record<string,string>={APPROVAL_ALREADY_EXISTS:"이미 활성 승인된 계정입니다.",INVALID_FIELDS:"외부 Google 이메일과 예약 권한을 확인해 주세요."};setMessage(errors[result.error]??"계정을 사전 승인하지 못했습니다.");return}setForm({email:"",reservedRole:"club_manager"});setMessage("외부 Google 계정을 사전 승인했습니다.");await load()}finally{setSaving(false)}}
 async function deactivate(account:AllowedAccount){if(!confirm("아직 사용되지 않은 이 계정 승인을 취소할까요?"))return;const response=await fetch(`/api/admin/allowed-accounts/${account.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({isActive:false})});setMessage(response.ok?"계정 사전 승인을 취소했습니다.":"사용 완료되었거나 이미 취소된 승인입니다.");if(response.ok)await load()}
 return <PortalShell title="교사 관리" description="학생 계정을 담당 교사로 지정하고 외부 Google 계정을 사전 승인합니다.">
  {message&&<p className={message.includes("했습니다")?"form-success":"form-error"} role="status">{message}</p>}
  <section className="panel allowed-account-panel"><header><div><h2>외부 Google 계정 사전 승인</h2><p>학교 도메인이 아닌 담당교사·관리자 계정만 사전에 승인합니다.</p></div></header><form onSubmit={approve}><label>Google 계정 이메일<input type="email" required maxLength={254} autoComplete="off" placeholder="teacher@example.com" value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></label><label>예약 권한<select value={form.reservedRole} onChange={event=>setForm({...form,reservedRole:event.target.value as "club_manager"|"admin"})}><option value="club_manager">담당교사</option><option value="admin">관리자</option></select></label><button className="primary" disabled={saving}>{saving?"승인 중…":"사전 승인"}</button></form>
   <div className="allowed-account-list">{accounts.length===0?<p className="admin-inline-empty">등록된 외부 계정 승인이 없습니다.</p>:accounts.map(account=><article key={account.id}><div><strong>{account.email}</strong><small>{account.reservedRole==="admin"?"관리자":"담당교사"} · {formatDate(account.createdAt)}</small></div><span className={`state approval-${approvalStatus(account).replace(" ","")}`}>{approvalStatus(account)}</span>{account.isActive&&!account.usedAt&&<button type="button" className="text-danger" onClick={()=>deactivate(account)}>승인 취소</button>}</article>)}</div>
  </section>
  <section className="teacher-role-section"><h2>로그인 사용자 역할</h2><div className="list-stack">{users.map(user=><article className="list-card" key={user.id}><div><small>{user.isActive?"활성":"비활성"}</small><h3>{user.alias}</h3><p>{user.role==="teacher"?"담당 교사":"학생"}</p></div><div><span className="state">{user.role==="teacher"?"담당 교사":"학생"}</span><button className="secondary" onClick={()=>change(user)}>{user.role==="teacher"?"학생으로 변경":"교사로 지정"}</button></div></article>)}</div></section>
 </PortalShell>
}
