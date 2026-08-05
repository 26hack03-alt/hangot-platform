import { NextResponse } from "next/server";
import { refreshProviderSession, safeInternalPath } from "../../../lib/supabase-auth";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"));
  const refreshed = await refreshProviderSession();
  return NextResponse.redirect(new URL(refreshed ? next : `/login?next=${encodeURIComponent(next)}`, url.origin));
}
