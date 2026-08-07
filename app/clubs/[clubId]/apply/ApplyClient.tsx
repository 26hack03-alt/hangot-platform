"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "../../../components/PortalShell";
import type { ApplicationAvailability, ClubSource } from "../../../lib/clubs";

const initialForm = { motivation: "", interestArea: "", careerInterest: "", experience: "", additionalMessage: "", confirmed: false };

export default function ApplyClient({ club, availability, applicant }: { club: ClubSource; availability: ApplicationAvailability; applicant: { studentName: string; studentNumber: string } | null }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canApply = availability === "open";
  const applyPath = `/clubs/${club.club_id}/apply`;
  const profileHref = `/profile?next=${encodeURIComponent(applyPath)}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");
    if (!applicant) return setMessage("동아리 신청 전에 학생 정보 등록이 필요합니다.");
    if (form.motivation.trim().length < 20) return setMessage("지원 동기는 20자 이상 작성해 주세요.");
    if (!form.confirmed) return setMessage("제출 내용을 확인해 주세요.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clubId: club.club_id, ...form }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return router.push(`/login?next=${encodeURIComponent(applyPath)}`);
      if (data.error === "PROFILE_REQUIRED") {
        setMessage("동아리 신청 전에 학생 정보 등록이 필요합니다.");
        return;
      }
      const errors: Record<string, string> = {
        AUTH_REQUIRED: "로그인이 필요합니다.",
        PROFILE_REQUIRED: "동아리 신청 전에 학생 정보 등록이 필요합니다.",
        PERSONAL_DATA_DETECTED: "지원 내용에 입력하면 안 되는 개인정보가 포함되어 있습니다.",
        DUPLICATE_APPLICATION: "이미 신청한 동아리입니다.",
        CAPACITY_FULL: "모집 인원이 마감되었습니다.",
        RECRUITMENT_CLOSED: "현재 신청할 수 없는 동아리입니다.",
        INQUIRY_ONLY: "이 동아리는 직접 신청이 아니라 담당자 문의가 필요합니다.",
        CONFIRMATION_REQUIRED: "제출 내용을 확인해 주세요.",
        INVALID_FIELDS: "입력 내용과 글자 수를 확인해 주세요.",
        RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        INVALID_ORIGIN: "요청을 처리할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
      };
      if (!response.ok) return setMessage(errors[data.error] ?? "신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      router.push(`/my/applications/${data.application.id}?created=1`);
    } catch {
      setMessage("신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const blockedMessage = availability === "inquiry" ? "이 동아리는 직접 신청이 아니라 담당자 문의가 필요합니다." : "현재 모집이 마감되었거나 모집 정보를 확인해야 합니다.";

  return <PortalShell title={`${club.club_name} 신청`} description="동아리 정보를 확인하고 신청서를 작성해 주세요.">
    <section className="panel application-club-summary">
      <div className="application-summary-grid">
        <p><b>분야</b><span>{club.category}</span></p><p><b>동아리 유형</b><span>{club.selection_type}</span></p>
        <p><b>모집 상태</b><span>{club.recruitment_status}</span></p><p><b>신청 가능 여부</b><span>{canApply && applicant ? "신청 가능" : "신청 불가"}</span></p>
      </div>
      <h2>주요 활동</h2><p className="pre-line">{club.activities}</p>
    </section>
    {!applicant ? <div className="empty-panel profile-required-panel"><p>동아리 신청 전에 학생 정보 등록이 필요합니다.</p><Link className="primary link-button" href={profileHref}>학생 정보 등록</Link></div> : !canApply ? <div className="empty-panel"><p>{blockedMessage}</p></div> :
      <form className="panel form-panel" onSubmit={submit}>
        <div className="applicant-summary"><b>신청자</b><span>{applicant.studentNumber}-{applicant.studentName}</span></div>
        <div className="privacy-callout"><b>신청 내용 개인정보 안내</b><p>이름과 학번은 로그인 계정에 등록된 학생 정보를 사용합니다. 지원 동기와 추가 내용에는 전화번호, 이메일, 주소, 주민등록번호 등 신청에 필요하지 않은 개인정보를 입력하지 마세요.</p></div>
        <label>지원 동기 <small>필수 · 20~1000자</small><textarea required minLength={20} maxLength={1000} value={form.motivation} onChange={event => setForm({ ...form, motivation: event.target.value })}/></label>
        <label>관심 분야 <small>선택 · 최대 300자</small><input maxLength={300} value={form.interestArea} onChange={event => setForm({ ...form, interestArea: event.target.value })}/></label>
        <label>희망 진로 분야 <small>선택 · 최대 300자</small><input maxLength={300} value={form.careerInterest} onChange={event => setForm({ ...form, careerInterest: event.target.value })}/></label>
        <label>관련 활동 경험 <small>선택 · 최대 1000자</small><textarea maxLength={1000} value={form.experience} onChange={event => setForm({ ...form, experience: event.target.value })}/></label>
        <label>추가 전달 내용 <small>선택 · 최대 500자</small><textarea maxLength={500} value={form.additionalMessage} onChange={event => setForm({ ...form, additionalMessage: event.target.value })}/></label>
        <label className="check"><input type="checkbox" checked={form.confirmed} onChange={event => setForm({ ...form, confirmed: event.target.checked })}/> 등록된 학생 정보와 제출 내용을 확인했습니다.</label>
        {message && <><p className="form-error" role="alert">{message}</p>{message.includes("학생 정보 등록") && <Link className="secondary link-button" href={profileHref}>학생 정보 등록으로 이동</Link>}</>}
        <button className="primary" type="submit" disabled={submitting}>{submitting ? "제출 중…" : "신청 제출"}</button>
      </form>}
  </PortalShell>;
}
