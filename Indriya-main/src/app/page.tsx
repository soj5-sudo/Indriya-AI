import Link from "next/link";
import type { ReactElement } from "react";
import { LogoReveal } from "@/components/landing/LogoReveal";
import { WebGLParticles } from "@/components/landing/WebGLParticles";
import { Wordmark } from "@/components/Wordmark";

type HowItWorksStep = Readonly<{
  number: string;
  title: string;
  description: string;
}>;

const howItWorksSteps = [
  {
    number: "01",
    title: "Imagine",
    description:
      "Upload a reference, sketch on a blank canvas, or doodle over an image. Then tell us what to change.",
  },
  {
    number: "02",
    title: "Design",
    description: "You get three options back, pick your best.",
  },
  {
    number: "03",
    title: "Inquire",
    description:
      "Select, add notes, and send it to the customization team to check what is feasible.",
  },
] satisfies readonly HowItWorksStep[];

// Indriya's own gazelle, isolated from the brand footer artwork and served
// locally so the hero renders identically offline / on localhost.
const indriyaGazelleSrc = "/indriya-gazelle.png";

export default function LandingPage(): ReactElement {
  return (
    <main className="landing-page flex-1">
      <LogoReveal />
      <WebGLParticles />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark className="text-charcoal text-lg" />
        <Link href="/login" className="lg-btn lg-btn-ghost px-5 py-2 text-sm">
          Sign in
        </Link>
      </header>

      <div className="gold-rule relative z-10 mx-auto max-w-6xl" />

      {/* Hero */}
      <section className="landing-hero mx-auto max-w-6xl px-6 pt-16 pb-16">
        <div className="landing-hero-shell">
          <p className="landing-kicker">Bespoke Jewellery Atelier</p>
          <h1 className="landing-logo-lockup" aria-label="Indriya Aditya Birla Jewellery">
            <span className="landing-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={indriyaGazelleSrc} alt="" />
            </span>
            <span className="landing-logo-copy">
              <span className="landing-logo-name">Indriya</span>
              <span className="landing-logo-subline">
                <span>Aditya Birla</span>
                <span aria-hidden="true" className="landing-logo-divider" />
                <span>Jewellery</span>
              </span>
            </span>
          </h1>
          <p className="landing-body">
            Sketch it. Dream it. Wear it. Your masterpiece starts here.
          </p>

          <div className="landing-actions">
            <Link href="/login" className="landing-cta landing-cta-primary">
              <span>Start designing</span>
            </Link>
            <a href="#how" className="landing-cta landing-cta-ghost">
              <span>How it works</span>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="gold-rule mb-12" />
        <div className="grid gap-4 sm:grid-cols-3">
          {howItWorksSteps.map((step) => (
            <div key={step.number} className="landing-step text-center sm:text-left">
              <p className="font-display text-3xl text-gold">{step.number}</p>
              <h3 className="mt-3 text-xl text-charcoal">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 py-8 text-center text-xs tracking-wide text-muted">
        Indriya · Internal design tool for headquarters teams only.
      </footer>
    </main>
  );
}
