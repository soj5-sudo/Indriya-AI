import { Suspense } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LoginCard } from "./LoginCard";

export default function LoginPage() {
  return (
    <main className="auth-canvas flex flex-1 items-center justify-center px-6 py-16">
      <div className="lg-panel w-full max-w-md rounded-3xl px-10 py-12 text-center">
        <Wordmark className="text-charcoal text-lg" />
        <div className="gold-rule my-8" />
        <h1 className="font-display text-4xl text-emerald">Welcome back</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in with your Google account to enter the Indriya atelier.
        </p>

        <Suspense>
          <LoginCard />
        </Suspense>

        <p className="mt-10 text-xs tracking-wide text-muted">
          Internal use only. Your designs and inquiries are private to your
          account.
        </p>
      </div>
    </main>
  );
}
