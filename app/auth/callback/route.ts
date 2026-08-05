import { NextResponse } from "next/server";
import { ensureGoogleAppUser } from "../../lib/security";
import { authRequest, clearOAuthFlow, clearProviderSession, readOAuthFlow, setProviderSession } from "../../lib/supabase-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flow = await readOAuthFlow();
  if (!code || !flow.verifier) return NextResponse.redirect(new URL("/login?error=invalid-callback", url.origin));
  const response = await authRequest("/token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: code, code_verifier: flow.verifier }) }).catch(() => null);
  await clearOAuthFlow();
  if (!response?.ok) return NextResponse.redirect(new URL("/login?error=oauth-failed", url.origin));
  const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number; user?: { id?: string; email?: string } };
  const email = data.user?.email?.toLowerCase();
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN?.trim().toLowerCase();
  if (allowedDomain && (!email || email.split("@")[1] !== allowedDomain)) {
    await authRequest("/logout", { method: "POST", headers: { authorization: `Bearer ${data.access_token}` } }).catch(() => null);
    await clearProviderSession();
    return NextResponse.redirect(new URL("/login?error=domain", url.origin));
  }
  if (!data.user?.id) return NextResponse.redirect(new URL("/login?error=oauth-failed", url.origin));
  await ensureGoogleAppUser({ id: data.user.id, email });
  await setProviderSession(data.access_token, data.refresh_token, data.expires_in);
  return NextResponse.redirect(new URL(flow.next, url.origin));
}
