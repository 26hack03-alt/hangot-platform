"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PortalShell from "../../../components/PortalShell";

type Application = {
  applicationNumber: string; clubId: string; clubName: string; status: string;
  motivation: string; interestArea: string; careerInterest: string; experience: string;
  additionalMessage: string; submittedAt: string; updatedAt: string; cancelledAt: string | null; reviewedAt: string | null; reviewComment: string | null;
};
const labels: Record<string, string> = { submitted: "신청 완료", under_review: "검토 중", waiting: "대기", approved: "승인", rejected: "반려", cancelled: "취소" };
const cancellable = new Set(["submitted", "under_review", "waiting"]);

export default function ApplicationDetailClient({ applicationId }: { applicationId: string }) {
  const created = useSearchParams().get("created") === "1";
  const [application, setApplication] = useState<Application | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/applications/${applicationId}`, { cache: "no-store" });
    if (response.status === 401) return location.assign(`/login?next=${encodeURIComponent(`/my/applications/${applicationId}`)}`);
    if (!response.ok) return setNotFound(true);
    setApplication((await response.json()).application);
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  async function cancel() {
    if (!confirm("신청을 취소하시겠습니까? 취소 후 재신청은 운영 정책에 따라 제한될 수 있습니다.")) return;
    const response = await fetch(`/api/applications/${applicationId}/cancel`, { method: "POST" });
    if (!response.ok) return setMessage("현재 상태에서는 신청을 취소할 수 없습니다.");
    setMessage(""); await load();
  }

  return <PortalShell title={created ? "신청 완료" : "신청 상세"} description={created ? "동아리 신청이 정상적으로 접수되었습니다." : "제출한 신청 내용과 상태를 확인할 수 있습니다."}>
    {notFound ? <div className="empty-panel"><p>신청 내역을 찾을 수 없습니다.</p><Link href="/my/applications">내 신청 목록으로</Link></div> : !application
      ? <div className="empty-panel">신청 내역을 불러오는 중입니다.</div>
      : <div className="panel application-detail">
        <div className="application-detail-heading"><div><small>신청 번호</small><h2>{application.applicationNumber}</h2><p>{application.clubName}</p></div><span className={`state state-${application.status}`}>{labels[application.status] ?? application.status}</span></div>
        <dl className="application-detail-list">
          <div><dt>지원 동기</dt><dd>{application.motivation}</dd></div><div><dt>관심 분야</dt><dd>{application.interestArea || "작성하지 않음"}</dd></div>
          <div><dt>희망 진로</dt><dd>{application.careerInterest || "작성하지 않음"}</dd></div><div><dt>관련 활동 경험</dt><dd>{application.experience || "작성하지 않음"}</dd></div>
          <div><dt>추가 전달 내용</dt><dd>{application.additionalMessage || "작성하지 않음"}</dd></div><div><dt>제출 일시</dt><dd>{new Date(application.submittedAt).toLocaleString("ko-KR")}</dd></div>
          <div><dt>수정 일시</dt><dd>{new Date(application.updatedAt).toLocaleString("ko-KR")}</dd></div><div><dt>검토 시각</dt><dd>{application.reviewedAt ? new Date(application.reviewedAt).toLocaleString("ko-KR") : "아직 검토되지 않았습니다."}</dd></div><div><dt>검토 의견</dt><dd>{application.reviewComment || "등록된 검토 의견이 없습니다."}</dd></div>
        </dl>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="button-row"><Link className="secondary link-button" href="/my/applications">내 신청 내역으로 이동</Link><Link className="secondary link-button" href="/">동아리 목록으로 이동</Link>{cancellable.has(application.status) && <button className="text-danger" onClick={cancel}>신청 취소</button>}</div>
      </div>}
  </PortalShell>;
}
