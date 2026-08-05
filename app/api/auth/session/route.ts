import { currentUser } from "../../../lib/security";
import { refreshProviderSession } from "../../../lib/supabase-auth";
export async function GET() {
  let user = await currentUser();
  if (!user && await refreshProviderSession()) user = await currentUser();
  return Response.json({ user: user ? { alias: user.alias, role: user.role } : null });
}
