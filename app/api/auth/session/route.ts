import { currentUser } from "../../../lib/security";
import { refreshProviderSession } from "../../../lib/supabase-auth";
export async function GET() {
  let user = await currentUser();
  if (!user && await refreshProviderSession()) user = await currentUser();
  const profileCompleted = Boolean(user?.profileCompleted && user.studentNumber && user.studentName);
  return Response.json({ user: user ? { alias: user.alias, displayName: profileCompleted ? `${user.studentNumber}-${user.studentName}` : user.alias, profileCompleted, role: user.role } : null });
}
