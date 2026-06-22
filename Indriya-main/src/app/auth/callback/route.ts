import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/access";

/**
 * OAuth callback: exchanges the code for a session, enforces the (optional)
 * internal-domain gate, and ensures a profile row exists.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/studio";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  // Upsert a profile row (id == auth.uid). Safe to call on every login.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name:
        (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        null,
    },
    { onConflict: "id" }
  );

  return NextResponse.redirect(`${origin}${next}`);
}
