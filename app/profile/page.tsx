import PortalShell from "../components/PortalShell";
import ProfileClient from "./ProfileClient";

export default function ProfilePage() {
  return <PortalShell title="학생 정보 등록" description="동아리 신청자 확인을 위해 이름과 학번을 등록합니다.">
    <ProfileClient />
  </PortalShell>;
}
