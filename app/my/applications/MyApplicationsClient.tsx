"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/PortalShell";

type Application = { id: string; clubId: string; clubName: string; status: string; submittedAt: string; updatedAt: string; cancelledAt: string | null };
type Club = { club_id: string; category?: string; selection_type?: string; poster_url?: string; icon?: string; color?: string };
const labels: Record<string, string> = { submitted: "신청 완료", under_review: "검토 중", waiting: "대기", approved: "승인", rejected: "반려", cancelled: "취소" };
const cancellable = new Set(["submitted", "under_review", "waiting"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export default function MyApplicationsClient() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [applicationResponse, clubResponse] = await Promise.all([fetch("/api/applications/me", { cache: "no-store" }), fetch("/api/clubs", { cache: "no-store" })]);
    if (applicationResponse.status === 401) return location.assign("/login?next=%2Fmy%2Fapplications");
    const data = await applicationResponse.json().catch(() => ({}));
    const clubData = await clubResponse.json().catch(() => ({}));
    setItems(data.applications ?? []);
    setClubs(clubData.clubs ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const clubsById = useMemo(() => new Map(clubs.map((club) => [club.club_id, club])), [clubs]);
  const summary = useMemo(() => ({ all: items?.length ?? 0, waiting: items?.filter((item) => item.status === "waiting").length ?? 0, approved: items?.filter((item) => item.status === "approved").length ?? 0, rejected: items?.filter((item) => item.status === "rejected").length ?? 0 }), [items]);

  async function cancel(id: string) {
    if (cancellingId) return;
    if (!confirm("신청을 취소하시겠습니까? 취소 후 재신청은 운영 정책에 따라 제한될 수 있습니다.")) return;
    setCancellingId(id);
    try {
      const response = await fetch(`/api/applications/${id}/cancel`, { method: "POST" });
      if (!response.ok) setMessage("현재 상태에서는 신청을 취소할 수 없습니다.");
      else { setMessage(""); await load(); }
    } catch { setMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setCancellingId(null); }
  }

  return <PortalShell title="내 신청" description="신청한 동아리와 진행 상태를 확인하세요.">
    <section className="application-summary" aria-label="신청 상태 요약">
      <div><span aria-hidden="true">▣</span><small>전체 신청</small><strong>{summary.all}</strong></div>
      <div className="summary-waiting"><span aria-hidden="true">◷</span><small>대기</small><strong>{summary.waiting}</strong></div>
      <div className="summary-approved"><span aria-hidden="true">✓</span><small>승인</small><strong>{summary.approved}</strong></div>
      <div className="summary-rejected"><span aria-hidden="true">×</span><small>반려</small><strong>{summary.rejected}</strong></div>
    </section>
    {message && <p className="form-error" role="alert">{message}</p>}
    {items === null ? <div className="empty-panel">신청 내역을 불러오는 중입니다.</div> : items.length === 0
      ? <div className="empty-panel application-empty"><p>아직 신청한 동아리가 없습니다.</p><span>더 많은 동아리에 도전해보세요!</span><Link className="secondary link-button" href="/clubs">동아리 찾기</Link></div>
      : <section className="application-list-panel"><div className="application-list-heading"><h2>신청 목록</h2><span>최신순</span></div><div className="application-card-grid">{items.map((item) => {
        const club = clubsById.get(item.clubId);
        return <article className="student-application-card" key={item.id}>
          <div className="student-application-intro"><div className="application-club-image" style={{ background: club?.color || "#eaf2ff" }}>{club?.poster_url ? <img src={club.poster_url} alt="" /> : <span aria-hidden="true">{club?.icon || "🏫"}</span>}</div><div className="application-club-copy"><div className="application-tags"><span>{club?.category || "동아리"}</span><span>{club?.selection_type || "모집 정보"}</span></div><h3>{item.clubName}</h3><span className={`state state-${item.status}`}>{labels[item.status] ?? "상태 확인 필요"}</span></div></div>
          <dl className="application-card-meta"><div><dt>▦ <span>신청일</span></dt><dd>{formatDate(item.submittedAt)}</dd></div><div><dt>✓ <span>신청 상태</span></dt><dd>{labels[item.status] ?? "상태 확인 필요"}</dd></div></dl>
          <div className="application-card-actions"><Link href={`/my/applications/${item.id}`}>신청 상세 보기 <span aria-hidden="true">›</span></Link>{cancellable.has(item.status) && <button className="text-danger" type="button" disabled={cancellingId !== null} onClick={() => cancel(item.id)}>{cancellingId === item.id ? "취소 중…" : "신청 취소"}</button>}</div>
        </article>;
      })}</div></section>}
  </PortalShell>;
}
