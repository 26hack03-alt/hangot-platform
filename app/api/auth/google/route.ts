import { NextResponse } from "next/server";
import { pkceChallenge, publicAuthConfig, randomBase64Url, safeInternalPath, setOAuthFlow } from "../../../lib/supabase-auth";

export async function GET(request: Request) {
  let failureCode = "oauth-start";

  try {
    const url = new URL(request.url);
    const next = safeInternalPath(url.searchParams.get("next"));

    failureCode = "oauth-pkce";
    const verifier = randomBase64Url(48);

    failureCode = "oauth-cookie";
    await setOAuthFlow(verifier, next);

    failureCode = "oauth-pkce";
    const challenge = await pkceChallenge(verifier);

    failureCode = "not-configured";
    const { url: supabaseUrl } = publicAuthConfig();

    failureCode = "oauth-start";
    const callback = `${process.env.APP_URL || url.origin}/auth/callback`;
    const authorize = new URL(`${supabaseUrl}/auth/v1/authorize`);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", callback);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "s256");
    authorize.searchParams.set("scopes", "openid email");
    return NextResponse.redirect(authorize);
  } catch (error) {
    const details = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error), stack: undefined };

    console.error("Google OAuth startup failed", {
      ...details,
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        APP_URL: Boolean(process.env.APP_URL),
        NODE_ENV: Boolean(process.env.NODE_ENV),
      },
    });

    return NextResponse.redirect(new URL(`/login?error=${failureCode}`, request.url));
  }
}
