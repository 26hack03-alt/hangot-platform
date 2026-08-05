import { NextResponse } from "next/server";
import { pkceChallenge, publicAuthConfig, randomBase64Url, safeInternalPath, setOAuthFlow } from "../../../lib/supabase-auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const next = safeInternalPath(url.searchParams.get("next"));
    const verifier = randomBase64Url(48);
    await setOAuthFlow(verifier, next);
    const challenge = await pkceChallenge(verifier);
    const { url: supabaseUrl } = publicAuthConfig();
    const callback = `${process.env.APP_URL || url.origin}/auth/callback`;
    const authorize = new URL(`${supabaseUrl}/auth/v1/authorize`);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", callback);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "s256");
    authorize.searchParams.set("scopes", "openid email");
    return NextResponse.redirect(authorize);
  } catch {
    return NextResponse.redirect(new URL("/login?error=not-configured", request.url));
  }
}
