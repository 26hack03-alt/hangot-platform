import { sameOrigin } from "../../../lib/security";
import { authRequest, clearProviderSession, providerAccessToken } from "../../../lib/supabase-auth";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const token = await providerAccessToken();
  if (token) await authRequest("/logout", { method: "POST", headers: { authorization: `Bearer ${token}` } }).catch(() => null);
  await clearProviderSession();
  return Response.json({ ok: true });
}
