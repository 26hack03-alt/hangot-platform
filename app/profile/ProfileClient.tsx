"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Profile = {
  studentName: string | null;
  studentNumber: string | null;
  schoolYear: number | null;
  profileCompleted: boolean;
};

const messages: Record<string, string> = {
  AUTH_REQUIRED: "로그인 후 학생 정보를 등록할 수 있습니다.",
  PRIVACY_CONSENT_REQUIRED: "개인정보 수집·이용에 동의해 주세요.",
  INVALID_STUDENT_NAME: "이름은 한글·영문·공백으로 2자 이상 20자 이하로 입력해 주세요.",
  INVALID_STUDENT_NUMBER: "학번은 숫자 4자 이상 12자 이하로 입력해 주세요.",
  INVALID_SCHOOL_YEAR: "학년도는 2020년부터 2100년 사이로 입력해 주세요.",
  STUDENT_NUMBER_ALREADY_USED: "해당 학년도의 학번이 이미 등록되어 있습니다.",
};

export default function ProfileClient({ next }: { next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ studentName: "", studentNumber: "", schoolYear: "2026", privacyConsent: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void fetch("/api/profile", { cache: "no-store" }).then(async response => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setMessage(messages[data.error ?? ""] ?? "학생 정보를 불러오지 못했습니다.");
        return;
      }
      const data = await response.json() as { profile: Profile };
      setForm(current => ({ ...current, studentName: data.profile.studentName ?? "", studentNumber: data.profile.studentNumber ?? "", schoolYear: String(data.profile.schoolYear ?? 2026) }));
    }).catch(() => setMessage("학생 정보를 불러오지 못했습니다.")).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess(false);
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    if (!response) {
      setMessage("학생 정보를 저장하지 못했습니다.");
      setSaving(false);
      return;
    }
    const data = await response.json().catch(() => ({})) as { error?: string; profile?: Profile };
    if (!response.ok) setMessage(messages[data.error ?? ""] ?? "학생 정보를 저장하지 못했습니다.");
    else {
      setSuccess(true);
      setMessage("학생 정보를 저장했습니다.");
      if (next !== "/") router.replace(next);
    }
    setSaving(false);
  }

  return <form className="panel form-panel profile-form" onSubmit={submit}>
    <div className="profile-fields">
      <label htmlFor="student-name">이름<input id="student-name" name="studentName" required minLength={2} maxLength={20} autoComplete="name" value={form.studentName} onChange={event => setForm({ ...form, studentName: event.target.value })} disabled={loading || saving} /></label>
      <label htmlFor="student-number">학번<input id="student-number" name="studentNumber" required minLength={4} maxLength={12} inputMode="numeric" pattern="[0-9]{4,12}" autoComplete="off" value={form.studentNumber} onChange={event => setForm({ ...form, studentNumber: event.target.value })} disabled={loading || saving} /></label>
    </div>

    <section className="profile-privacy" aria-labelledby="privacy-title">
      <h2 id="privacy-title">[필수] 개인정보 수집·이용 동의</h2>
      <dl>
        <div><dt>수집 항목</dt><dd>학생 이름, 학번</dd></div>
        <div><dt>수집 목적</dt><dd>동아리 신청자 확인, 신청 내역 관리, 관리자 및 담당 교사의 신청 검토</dd></div>
        <div><dt>보유 기간</dt><dd>해당 학년도 동아리 운영을 위해 필요한 기간이며, 구체적인 보유 기간은 학교 운영 정책에 따릅니다.</dd></div>
      </dl>
      <p>동의를 거부할 수 있으나, 동의하지 않으면 개인정보가 필요한 동아리 신청 기능을 이용할 수 없습니다.</p>
      <label className="check" htmlFor="privacy-consent"><input id="privacy-consent" type="checkbox" checked={form.privacyConsent} onChange={event => setForm({ ...form, privacyConsent: event.target.checked })} disabled={loading || saving} /> 위 개인정보 수집·이용에 동의합니다.</label>
    </section>

    {message && <p className={success ? "form-success" : "form-error"} role="status">{message}</p>}
    <div className="button-row profile-actions"><Link className="secondary link-button" href={next}>{next === "/" ? "홈으로 이동" : "신청 화면으로 돌아가기"}</Link><button className="primary" type="submit" disabled={loading || saving}>{saving ? "저장 중…" : "저장"}</button></div>
  </form>;
}
