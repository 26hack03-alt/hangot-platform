import Link from "next/link";
import PortalShell from "../components/PortalShell";

const errors: Record<string, string> = {
  domain: "허용된 학교 Google 계정으로 로그인해 주세요.",
  "external-account-not-approved": "이 Google 계정은 한곳 사용 승인을 받지 않았습니다. 담당 관리자에게 계정 승인을 요청해 주세요.",
  "account-inactive": "비활성화된 계정입니다. 관리자에게 문의해 주세요.",
  "invalid-callback": "로그인 요청이 만료되었습니다. 다시 시도해 주세요.",
  "oauth-failed": "Google 로그인을 완료하지 못했습니다.",
  "not-configured": "로그인 설정이 아직 완료되지 않았습니다.",
  "oauth-cookie": "로그인 정보를 안전하게 저장하지 못했습니다. 브라우저 쿠키 설정을 확인해 주세요.",
  "oauth-pkce": "로그인 보안 정보를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  "oauth-start": "Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  return <PortalShell title="Google 계정 로그인" description="학교에서 사용하는 Google 계정으로 로그인해 주세요.">
    <div className="panel auth-panel">
      {params.error && <p className="form-error" role="alert">{errors[params.error] || "인증 중 오류가 발생했습니다."}</p>}
      <a className="primary link-button" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>Google 계정으로 로그인</a>
      <div className="privacy-callout"><b>공개 정보는 로그인 없이 볼 수 있습니다.</b><p>동아리 신청, 게시글·질문 작성과 내 활동 확인에는 로그인이 필요합니다.</p></div>
      <Link href="/">홈으로 돌아가기</Link>
    </div>
  </PortalShell>;
}
