import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/board";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const displayName =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          (user.email ? user.email.split("@")[0] : null);
        // Idempotent: creates a Member row tied to this auth user on first
        // login, returns the existing one on subsequent logins. Failures
        // here should not block the sign-in flow.
        await supabase.rpc("ensure_self_member", {
          display_name: displayName,
          role: "Owner",
          avatar_color: "blue",
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
