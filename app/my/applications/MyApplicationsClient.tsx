"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PortalShell from "../../components/PortalShell";

type Application = { id: string; applicationNumber: string; clubId: string; clubName: string; status: string; submittedAt: string; updatedAt: string; cancelledAt: string | null };
const labels: Record<string, string> = { submitted: "신청 완료", under_review: "검토 중", waiting: "대기", approved: "승인", rejected: "반려", cancelled: "취소" };
const cancellable = new Set(["submitted", "under_review", "waiting"]);

export default function MyApplicationsClient() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/applications/me", { cache: "no-store" });
    if (response.status === 401) return location.assign("/login?next=%2Fmy%2Fapplications");
    const data = await response.json().catch(() => ({}));
    setItems(data.applications ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function cancel(id: string) {
    if (cancellingId) return;
    if (!confirm("신청을 취소하시겠습니까? 취소 후 재신청은 운영 정책에 따라 제한될 수 있습니다.")) return;
    setCancellingId(id);
    try {
      const response = await fetch(`/api/applications/${id}/cancel`, { method: "POST" });
      if (!response.ok) setMessage("현재 상태에서는 신청을 취소할 수 없습니다.");
      else { setMessage(""); await load(); }
    } catch {
      setMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCancellingId(null);
    }
  }

  return <PortalShell title="내 신청" description="신청 내역과 진행 상태를 확인할 수 있습니다.">
    {message && <p className="form-error" role="alert">{message}</p>}
    {items === null ? <div className="empty-panel">신청 내역을 불러오는 중입니다.</div> : items.length === 0
      ? <div className="empty-panel"><p>아직 신청한 동아리가 없습니다.</p><Link className="primary link-button" href="/">동아리 찾기</Link></div>
      : <div className="list-stack">{items.map((item) => <article className="list-card" key={item.id}>
          <div><small>{item.applicationNumber}</small><h3>{item.clubName}</h3><p>{new Date(item.submittedAt).toLocaleString("ko-KR")}</p></div>
          <div><span className={`state state-${item.status}`}>{labels[item.status] ?? "상태 확인 필요"}</span><Link href={`/my/applications/${item.id}`}>상세 보기</Link>{cancellable.has(item.status) && <button className="text-danger" type="button" disabled={cancellingId !== null} onClick={() => cancel(item.id)}>{cancellingId === item.id ? "취소 중…" : "신청 취소"}</button>}</div>
        </article>)}</div>}
  </PortalShell>;
}
