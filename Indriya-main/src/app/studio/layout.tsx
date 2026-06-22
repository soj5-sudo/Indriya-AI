import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Wordmark";
import { SignOutButton } from "@/components/studio/SignOutButton";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // First-time customers complete their contact details before the studio.
  if (!user.user_metadata?.contact_done) {
    redirect("/welcome");
  }

  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    user.email ??
    "";

  return (
    <div className="studio-canvas flex h-screen flex-col">
      <header className="lg-rail flex shrink-0 items-center justify-between border-b border-white/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <Wordmark className="text-charcoal text-base" />
          <span className="hidden text-[11px] uppercase tracking-[0.32em] text-gold sm:inline">
            Atelier
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">{name}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
