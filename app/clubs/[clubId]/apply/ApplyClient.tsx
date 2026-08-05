"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "../../../components/PortalShell";
import type { ApplicationAvailability, ClubSource } from "../../../lib/clubs";

const initialForm = { motivation: "", interestArea: "", careerInterest: "", experience: "", additionalMessage: "", confirmed: false };

export default function ApplyClient({ club, availability }: { club: ClubSource; availability: ApplicationAvailability }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canApply = availability === "open";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (form.motivation.trim().length < 20) return setMessage("지원 동기는 20자 이상 작성해 주세요.");
    if (!form.confirmed) return setMessage("제출 내용을 확인해 주세요.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clubId: club.club_id, ...form }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return router.push(`/login?next=${encodeURIComponent(`/clubs/${club.club_id}/apply`)}`);
      const errors: Record<string, string> = {
        PERSONAL_DATA_DETECTED: "개인정보로 보이는 내용이 있습니다. 이름·학번·반·연락처를 삭제해 주세요.",
        DUPLICATE_APPLICATION: "이미 이 동아리에 신청했습니다. 내 신청 내역에서 확인해 주세요.",
        CAPACITY_FULL: "모집 정원이 마감되었습니다.",
        RECRUITMENT_CLOSED: "현재 신청할 수 없는 동아리입니다.",
        INQUIRY_ONLY: "이 동아리는 직접 신청이 아니라 담당자 문의가 필요합니다.",
        CONFIRMATION_REQUIRED: "제출 내용을 확인해 주세요.",
        INVALID_FIELDS: "입력 내용과 글자 수를 확인해 주세요.",
      };
      if (!response.ok) return setMessage(errors[data.error] ?? "신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      router.push(`/my/applications/${data.application.id}?created=1`);
    } catch {
      setMessage("신청을 처리하지 못했습니다. 네트워크 연결을 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const blockedMessage = availability === "inquiry"
    ? "이 동아리는 직접 신청이 아니라 담당자 문의가 필요합니다."
    : "현재 모집이 마감되었거나 모집 정보를 확인해야 합니다.";

  return <PortalShell title={`${club.club_name} 신청`} description="동아리 정보를 확인하고 신청서를 작성해 주세요.">
    <section className="panel application-club-summary">
      <div className="application-summary-grid">
        <p><b>분야</b><span>{club.category}</span></p><p><b>동아리 유형</b><span>{club.selection_type}</span></p>
        <p><b>모집 상태</b><span>{club.recruitment_status}</span></p><p><b>신청 가능 여부</b><span>{canApply ? "신청 가능" : "신청 불가"}</span></p>
      </div>
      <h2>주요 활동</h2><p className="pre-line">{club.activities}</p>
    </section>
    {!canApply ? <div className="empty-panel"><p>{blockedMessage}</p></div> :
      <form className="panel form-panel" onSubmit={submit}>
        <div className="privacy-callout"><b>개인정보 작성 금지</b><p>이름, 학번, 반, 전화번호 등 개인정보를 작성하지 마세요.</p></div>
        <label>지원 동기 <small>필수 · 20~1000자</small><textarea required minLength={20} maxLength={1000} value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })}/></label>
        <label>관심 분야 <small>선택 · 최대 300자</small><input maxLength={300} value={form.interestArea} onChange={(e) => setForm({ ...form, interestArea: e.target.value })}/></label>
        <label>희망 진로 분야 <small>선택 · 최대 300자</small><input maxLength={300} value={form.careerInterest} onChange={(e) => setForm({ ...form, careerInterest: e.target.value })}/></label>
        <label>관련 활동 경험 <small>선택 · 최대 1000자</small><textarea maxLength={1000} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}/></label>
        <label>추가 전달 내용 <small>선택 · 최대 500자</small><textarea maxLength={500} value={form.additionalMessage} onChange={(e) => setForm({ ...form, additionalMessage: e.target.value })}/></label>
        <label className="check"><input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}/> 개인정보를 작성하지 않았고 제출 내용을 확인했습니다.</label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <button className="primary" type="submit" disabled={submitting}>{submitting ? "제출 중…" : "신청 제출"}</button>
      </form>}
  </PortalShell>;
}
