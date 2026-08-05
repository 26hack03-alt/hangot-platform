import Link from "next/link";
import PortalShell from "../components/PortalShell";
export default function ForbiddenPage(){return <PortalShell title="접근 권한이 없습니다" description="현재 Google 계정으로 이용할 수 없는 페이지입니다."><div className="empty-panel"><Link className="primary link-button" href="/">홈으로</Link></div></PortalShell>}
