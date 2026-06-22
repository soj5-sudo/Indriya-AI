import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Wordmark";
import { ContactForm } from "./ContactForm";

/**
 * Contact-details capture shown straight after a customer's first Google
 * sign-in. Saved into the auth user's metadata, so no extra table is needed.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.contact_done) redirect("/studio");

  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    "";

  return (
    <main className="auth-canvas flex flex-1 items-center justify-center px-6 py-16">
      <div className="lg-panel w-full max-w-md rounded-3xl px-9 py-11 text-center">
        <Wordmark className="text-charcoal text-lg" />
        <div className="gold-rule my-7" />
        <h1 className="font-display text-3xl text-emerald">
          Welcome to the atelier
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A few details so the customization team can reach you about your
          designs.
        </p>

        <ContactForm defaultName={name} />
      </div>
    </main>
  );
}
