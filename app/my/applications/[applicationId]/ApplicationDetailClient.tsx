"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PortalShell from "../../../components/PortalShell";

type Application = { clubId: string; clubName: string; status: string; motivation: string; interestArea: string; careerInterest: string; experience: string; additionalMessage: string; submittedAt: string; updatedAt: string; cancelledAt: string | null; reviewedAt: string | null; reviewComment: string | null };
type Club = { club_id: string; category?: string; selection_type?: string; poster_url?: string; icon?: string; color?: string };
const labels: Record<string, string> = { submitted: "신청 완료", under_review: "검토 중", waiting: "대기", approved: "승인", rejected: "반려", cancelled: "취소" };
const cancellable = new Set(["submitted", "under_review", "waiting"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const notices: Record<string, { title: string; body: string }> = {
  submitted: { title: "신청이 완료되었습니다.", body: "담당자의 검토가 시작될 때까지 기다려 주세요." }, under_review: { title: "현재 신청을 검토하고 있습니다.", body: "검토가 완료되면 현재 상태에서 결과를 확인할 수 있습니다." }, waiting: { title: "대기 상태입니다.", body: "담당자의 추가 검토 결과를 기다려 주세요." }, approved: { title: "승인되었습니다.", body: "선발을 축하드립니다! 동아리 활동에 성실히 참여해 주세요." }, rejected: { title: "이번 신청은 반려되었습니다.", body: "아래에 검토 의견이 있다면 함께 확인해 주세요." }, cancelled: { title: "취소된 신청입니다.", body: "이 신청은 취소되어 더 이상 심사가 진행되지 않습니다." },
};

export default function ApplicationDetailClient({ applicationId }: { applicationId: string }) {
  const created = useSearchParams().get("created") === "1";
  const [application, setApplication] = useState<Application | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const load = useCallback(async () => {
    const [applicationResponse, clubResponse] = await Promise.all([fetch(`/api/applications/${applicationId}`, { cache: "no-store" }), fetch("/api/clubs", { cache: "no-store" })]);
    if (applicationResponse.status === 401) return location.assign(`/login?next=${encodeURIComponent(`/my/applications/${applicationId}`)}`);
    if (!applicationResponse.ok) return setNotFound(true);
    const nextApplication = (await applicationResponse.json()).application as Application;
    const clubData = await clubResponse.json().catch(() => ({}));
    setApplication(nextApplication);
    setClub((clubData.clubs ?? []).find((item: Club) => item.club_id === nextApplication.clubId) ?? null);
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  async function cancel() {
    if (cancelling) return;
    if (!confirm("신청을 취소하시겠습니까? 취소 후 재신청은 운영 정책에 따라 제한될 수 있습니다.")) return;
    setCancelling(true);
    try { const response = await fetch(`/api/applications/${applicationId}/cancel`, { method: "POST" }); if (!response.ok) return setMessage("현재 상태에서는 신청을 취소할 수 없습니다."); setMessage(""); await load(); }
    catch { setMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setCancelling(false); }
  }

  const notice = application ? notices[application.status] ?? { title: "신청 상태를 확인해 주세요.", body: "현재 처리 상태는 위의 상태 표시에서 확인할 수 있습니다." } : null;
  return <PortalShell title={created ? "신청 완료" : "신청 상세 보기"} description={created ? "동아리 신청이 정상적으로 접수되었습니다." : "신청한 동아리의 상세 정보를 확인하세요."}>
    {notFound ? <div className="empty-panel"><p>신청 내역을 찾을 수 없습니다.</p><Link href="/my/applications">내 신청 목록으로</Link></div> : !application ? <div className="empty-panel">신청 내역을 불러오는 중입니다.</div> : <div className="student-application-detail">
      <section className="application-overview-card"><div className="application-club-image" style={{ background: club?.color || "#eaf2ff" }}>{club?.poster_url ? <img src={club.poster_url} alt="" /> : <span aria-hidden="true">{club?.icon || "🏫"}</span>}</div><div className="application-club-copy"><div className="application-tags"><span>{club?.category || "동아리"}</span><span>{club?.selection_type || "모집 정보"}</span></div><h2>{application.clubName}</h2><span className={`state state-${application.status}`}>{labels[application.status] ?? "상태 확인 필요"}</span></div><dl className="application-card-meta"><div><dt>▦ <span>신청일</span></dt><dd>{formatDate(application.submittedAt)}</dd></div><div><dt>✓ <span>신청 상태</span></dt><dd>{labels[application.status] ?? "상태 확인 필요"}</dd></div></dl></section>
      <section className="application-content-card"><h2>신청 내용</h2><dl className="application-answer-list"><div><dt><span>▧</span>지원 동기</dt><dd>{application.motivation}</dd></div><div><dt><span>▣</span>관심 분야</dt><dd>{application.interestArea || "작성하지 않음"}</dd></div><div><dt><span>♧</span>희망 진로</dt><dd>{application.careerInterest || "작성하지 않음"}</dd></div><div><dt><span>#</span>관련 활동 경험</dt><dd>{application.experience || "작성하지 않음"}</dd></div><div><dt><span>▱</span>추가 전달 내용 <small>(선택)</small></dt><dd>{application.additionalMessage || "작성하지 않음"}</dd></div></dl></section>
      <section className={`application-status-notice notice-${application.status}`}><span aria-hidden="true">✓</span><div><strong>{notice?.title}</strong><p>{notice?.body}</p>{application.status === "rejected" && application.reviewComment && <p className="review-comment">검토 의견: {application.reviewComment}</p>}</div></section>
      {message && <p className="form-error" role="alert">{message}</p>}<div className="application-detail-actions">{cancellable.has(application.status) && <button className="cancel-application" type="button" disabled={cancelling} onClick={cancel}>{cancelling ? "취소 중…" : "신청 취소하기"}</button>}<Link className="primary link-button" href="/my/applications">‹ &nbsp; 목록으로 돌아가기</Link></div>
    </div>}
  </PortalShell>;
}
