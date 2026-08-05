"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "../components/PortalShell";

type Application = { id: string; publicId: string; clubId: string; status: string; submittedAt: string };
const labels: Record<string,string> = { submitted:"접수",under_review:"검토 중",waiting:"대기",approved:"승인",rejected:"반려",cancelled:"취소" };
export default function MyClient() {
  const [items, setItems] = useState<Application[]>([]);
  const [login, setLogin] = useState(true);
  const load = () => fetch("/api/applications").then(async r => { if (r.status === 401) { setLogin(false); return; } setItems((await r.json()).applications ?? []); });
  useEffect(() => { load(); }, []);
  async function cancel(id: string) { if (!confirm("신청을 취소할까요?")) return; await fetch(`/api/applications/${id}/cancel`, { method:"POST" }); load(); }
  return <PortalShell title="내 신청 현황" description="실제 신원 정보 없이 익명 신청 번호로 진행 상태를 확인합니다.">
    {!login ? <div className="empty-panel"><p>익명 로그인이 필요합니다.</p><Link className="primary link-button" href="/login">익명 로그인</Link></div> :
      items.length === 0 ? <div className="empty-panel"><p>아직 신청한 동아리가 없습니다.</p><Link className="primary link-button" href="/">동아리 찾기</Link></div> :
      <div className="list-stack">{items.map(item => <article className="list-card" key={item.id}><div><small>{item.publicId}</small><h3>{item.clubId}</h3><p>{new Date(item.submittedAt).toLocaleString("ko-KR")}</p></div><div><span className={`state state-${item.status}`}>{labels[item.status] ?? item.status}</span>{["submitted","under_review","waiting"].includes(item.status) && <button className="text-danger" onClick={() => cancel(item.id)}>신청 취소</button>}</div></article>)}</div>}
  </PortalShell>;
}
