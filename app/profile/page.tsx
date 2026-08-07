import PortalShell from "../components/PortalShell";
import { safeInternalPath } from "../lib/supabase-auth";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeInternalPath((await searchParams).next, "/");
  return <PortalShell title="학생 정보 등록" description="동아리 신청자 확인을 위해 이름과 학번을 등록합니다.">
    <ProfileClient next={next} />
  </PortalShell>;
}
