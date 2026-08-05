"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import PortalShell from "../../components/PortalShell";

type Application = { id:string; applicationNumber:string; userAlias:string; clubId:string; clubName:string; status:string; submittedAt:string; updatedAt:string; reviewedAt:string|null };
type Club = { club_id:string; club_name:string };
type Payload = { applications:Application[]; pagination:{page:number;pageSize:number;total:number;totalPages:number}; summary:{total:number;statusCounts:Record<string,number>} };
const labels:Record<string,string>={submitted:"신청 완료",under_review:"검토 중",waiting:"대기",approved:"승인",rejected:"반려",cancelled:"취소"};

export default function AdminApplicationsClient(){
  const[data,setData]=useState<Payload|null>(null); const[clubs,setClubs]=useState<Club[]>([]); const[error,setError]=useState("");
  const[filters,setFilters]=useState({status:"",clubId:"",search:"",sort:"newest"}); const[applied,setApplied]=useState(filters); const[page,setPage]=useState(1);
  const load=useCallback(async()=>{const params=new URLSearchParams({...applied,page:String(page),pageSize:"20"});const response=await fetch(`/api/admin/applications?${params}`,{cache:"no-store"});if(!response.ok){setError(response.status===403?"관리자 권한이 없습니다.":"신청 목록을 불러오지 못했습니다.");return}setError("");setData(await response.json())},[applied,page]);
  useEffect(()=>{void load()},[load]); useEffect(()=>{fetch("/api/clubs").then(r=>r.json()).then(d=>setClubs(d.clubs??[])).catch(()=>{})},[]);
  function search(event:FormEvent){event.preventDefault();setPage(1);setApplied(filters)}
  return <PortalShell title="신청 관리" description="전체 동아리 신청을 조회하고 검토 상태를 관리합니다.">
    {data&&<><div className="stats-grid admin-status-stats"><div className="stat"><span>전체 신청</span><b>{data.summary.total}</b></div>{Object.entries(labels).map(([status,label])=><div className="stat" key={status}><span>{label}</span><b>{data.summary.statusCounts[status]??0}</b></div>)}</div></>}
    <form className="panel admin-filters" onSubmit={search}><label>상태<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">전체 상태</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>동아리<select value={filters.clubId} onChange={e=>setFilters({...filters,clubId:e.target.value})}><option value="">전체 동아리</option>{clubs.map(c=><option value={c.club_id} key={c.club_id}>{c.club_name}</option>)}</select></label><label>검색<input maxLength={200} placeholder="신청 번호, 별칭, 동아리명, 지원 동기" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label><label>정렬<select value={filters.sort} onChange={e=>setFilters({...filters,sort:e.target.value})}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label><button className="primary" type="submit">조회</button></form>
    {error?<div className="empty-panel">{error}</div>:!data?<div className="empty-panel">신청 목록을 불러오는 중입니다.</div>:data.applications.length===0?<div className="empty-panel">조건에 맞는 신청이 없습니다.</div>:<div className="list-stack">{data.applications.map(item=><article className="list-card" key={item.id}><div><small>{item.applicationNumber} · {item.userAlias}</small><h3>{item.clubName}</h3><p>신청 {new Date(item.submittedAt).toLocaleString("ko-KR")} · 수정 {new Date(item.updatedAt).toLocaleString("ko-KR")}</p></div><div><span className={`state state-${item.status}`}>{labels[item.status]??item.status}</span><Link href={`/admin/applications/${item.id}`}>상세 보기</Link></div></article>)}</div>}
    {data&&data.pagination.totalPages>1&&<div className="pagination"><button className="secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>이전</button><span>{page} / {data.pagination.totalPages}</span><button className="secondary" disabled={page>=data.pagination.totalPages} onClick={()=>setPage(page+1)}>다음</button></div>}
  </PortalShell>
}
