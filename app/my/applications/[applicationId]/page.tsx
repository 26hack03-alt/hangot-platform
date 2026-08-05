import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/security";
import ApplicationDetailClient from "./ApplicationDetailClient";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  if (!await currentUser()) redirect(`/login?next=${encodeURIComponent(`/my/applications/${applicationId}`)}`);
  return <ApplicationDetailClient applicationId={applicationId}/>;
}
