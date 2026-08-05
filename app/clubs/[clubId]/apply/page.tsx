import { redirect } from "next/navigation";
import { applicationAvailability, findClub } from "../../../lib/clubs";
import { currentUser } from "../../../lib/security";
import ApplyClient from "./ApplyClient";

export default async function ApplyPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/clubs/${clubId}/apply`)}`);
  const club = findClub(clubId);
  if (!club) redirect("/");
  return <ApplyClient club={club} availability={applicationAvailability(club.recruitment_status)}/>;
}
