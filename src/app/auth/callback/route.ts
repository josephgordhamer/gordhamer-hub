import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/home";

  // Surface OAuth provider errors directly (e.g. user denied consent)
  const providerError = searchParams.get("error_description") || searchParams.get("error");

  if (!code) {
    const url = `${origin}/login?error=callback_no_code` +
      (providerError ? `&detail=${encodeURIComponent(providerError)}` : "");
    return NextResponse.redirect(url);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Bubble up the real error message
  const detail = error.message || "unknown";
  return NextResponse.redirect(
    `${origin}/login?error=callback_failed&detail=${encodeURIComponent(detail)}`,
  );
}
