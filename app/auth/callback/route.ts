import { NextResponse } from "next/server";
import { ensureGoogleAppUser } from "../../lib/security";
import { authRequest, clearOAuthFlow, clearProviderSession, readOAuthFlow, setProviderSession } from "../../lib/supabase-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appOrigin = new URL(process.env.APP_URL || url.origin).origin;
  const code = url.searchParams.get("code");
  const flow = await readOAuthFlow();
  if (!code || !flow.verifier) {
    console.error("Google OAuth callback is missing required state", {
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        APP_URL: Boolean(process.env.APP_URL),
        ALLOWED_ORIGIN: Boolean(process.env.ALLOWED_ORIGIN),
        ALLOWED_GOOGLE_DOMAIN: Boolean(process.env.ALLOWED_GOOGLE_DOMAIN),
      },
      verifierCookie: Boolean(flow.verifier),
      authCode: Boolean(code),
    });
    return NextResponse.redirect(new URL("/login?error=invalid-callback", appOrigin));
  }
  const response = await authRequest("/token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: code, code_verifier: flow.verifier }) }).catch(() => null);
  await clearOAuthFlow();
  if (!response?.ok) return NextResponse.redirect(new URL("/login?error=oauth-failed", appOrigin));
  const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number; user?: { id?: string; email?: string } };
  const email = data.user?.email?.toLowerCase();
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN?.trim().toLowerCase();
  if (allowedDomain && (!email || email.split("@")[1] !== allowedDomain)) {
    await authRequest("/logout", { method: "POST", headers: { authorization: `Bearer ${data.access_token}` } }).catch(() => null);
    await clearProviderSession();
    return NextResponse.redirect(new URL("/login?error=domain", appOrigin));
  }
  if (!data.user?.id) return NextResponse.redirect(new URL("/login?error=oauth-failed", appOrigin));
  await ensureGoogleAppUser({ id: data.user.id, email });
  await setProviderSession(data.access_token, data.refresh_token, data.expires_in);
  return NextResponse.redirect(new URL(flow.next, appOrigin));
}
