"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import PortalShell from "../components/PortalShell";
export default function AdminClient(){
 const[stats,setStats]=useState<Record<string,number>|null>(null);const[error,setError]=useState("");const[sync,setSync]=useState("");
 useEffect(()=>{fetch("/api/admin/overview").then(async r=>{if(!r.ok){setError(r.status===403?"관리자 권한이 없습니다.":"익명 로그인이 필요합니다.");return}setStats((await r.json()).stats)})},[]);
 async function runSync(){setSync("동기화 중…");const r=await fetch("/api/admin/sync",{method:"POST"});const d=await r.json();setSync(r.ok?`${d.succeeded}건 동기화, ${d.failed}건 실패`:"동기화를 실행하지 못했습니다.")}
 return <PortalShell title="운영 관리자" description="익명 데이터, 모집 운영 및 Google Sheets 동기화 상태를 관리합니다.">
  {error?<div className="empty-panel">{error}</div>:stats&&<><div className="stats-grid">{Object.entries({익명사용자:stats.users,전체신청:stats.applications,게시글:stats.posts,질문:stats.questions,동기화오류:stats.syncErrors}).map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}</div><div className="portal-grid two"><div className="panel"><h2>신청 관리</h2><p>전체 신청을 조회하고 상태와 검토 의견을 관리합니다.</p><Link className="primary link-button" href="/admin/applications">신청 관리로 이동</Link></div><div className="panel"><h2>담당 교사 관리</h2><p>교사 역할을 지정하고 담당 동아리를 배정합니다.</p><div className="button-row"><Link className="secondary link-button" href="/admin/teachers">교사 관리</Link><Link className="secondary link-button" href="/admin/teacher-assignments">담당 배정</Link></div></div><div className="panel"><h2>Google Sheets 동기화</h2><p>DB 저장이 먼저 완료되며, 실패한 작업은 여기서 안전하게 재시도합니다.</p><button className="primary" onClick={runSync}>대기 작업 동기화</button>{sync&&<p>{sync}</p>}</div></div></>}
 </PortalShell>
}
