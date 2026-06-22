"use client";

import { useEffect, useState } from "react";
import type { DesignView } from "@/lib/ai/types";
import type { UiDesign } from "./types";
import { BillOfMaterialsCard } from "./BillOfMaterialsCard";

const VIEW_LABELS: Record<string, string> = {
  front: "Front",
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
  inside: "Inside",
};

export function InquiryPanel({
  chatId,
  design,
  onClose,
  onSubmitted,
}: {
  chatId: string;
  design: UiDesign;
  onClose: () => void;
  /** Fired after a successful submit so the chat can echo the final BOM. */
  onSubmitted?: (design: UiDesign) => void;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-view gallery: generated lazily on inquire and cached server-side.
  const front: DesignView = { view: "front", imageUrl: design.imageUrl };
  const [views, setViews] = useState<DesignView[]>([front]);
  const [activeView, setActiveView] = useState<DesignView>(front);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => {
    // Reset to this design's front view when the selection changes.
    const f: DesignView = { view: "front", imageUrl: design.imageUrl };
    setViews([f]);
    setActiveView(f);

    if (!design.id) return;
    let cancelled = false;
    setLoadingViews(true);
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: design.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const extra: DesignView[] = Array.isArray(data.views) ? data.views : [];
        setViews([f, ...extra]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingViews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [design.id, design.imageUrl]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          designId: design.id,
          customerNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit inquiry.");
      } else {
        setDone(true);
        onSubmitted?.(design);
      }
    } catch {
      setError("Could not submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="lg-rail flex w-80 shrink-0 flex-col border-l border-white/50">
      <div className="flex items-center justify-between border-b border-white/50 px-5 py-3">
        <h3 className="font-display text-lg text-emerald">Send inquiry</h3>
        <button onClick={onClose} className="lg-icon h-8 w-8 text-sm">
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {done ? (
          <div className="rounded-xl bg-emerald/5 p-5 text-center">
            <p className="font-display text-xl text-emerald">Inquiry sent</p>
            <p className="mt-2 text-sm text-muted">
              Your selected design and notes have been routed to the
              customization team to assess feasibility.
            </p>
            <button
              onClick={onClose}
              className="lg-btn lg-btn-ghost mt-4 px-4 py-1.5 text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeView.imageUrl}
                alt={`${design.title} · ${VIEW_LABELS[activeView.view] ?? activeView.view}`}
                className="aspect-square w-full rounded-lg border border-line object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-charcoal/70 px-2 py-0.5 text-[10px] text-cream">
                {VIEW_LABELS[activeView.view] ?? activeView.view}
              </span>
            </div>

            {/* Viewpoint thumbnails */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {views.map((v) => (
                <button
                  key={v.view}
                  onClick={() => setActiveView(v)}
                  className={`h-12 w-12 overflow-hidden rounded-md border transition ${
                    v.view === activeView.view
                      ? "border-gold ring-1 ring-gold"
                      : "border-line hover:border-gold/60"
                  }`}
                  title={VIEW_LABELS[v.view] ?? v.view}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.imageUrl}
                    alt={VIEW_LABELS[v.view] ?? v.view}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
              {loadingViews && (
                <div className="flex h-12 items-center gap-2 rounded-md px-2 text-[11px] text-muted">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  Rendering views…
                </div>
              )}
            </div>

            <h4 className="mt-3 font-display text-lg text-emerald">
              {design.title}
            </h4>
            {loadingViews && (
              <p className="text-xs text-muted">
                Generating top, side &amp; inside views…
              </p>
            )}

            <BillOfMaterialsCard bom={design.billOfMaterials} />

            <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-muted">
              Notes for the team
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Anything specific about sizing, stones, timeline or budget expectations…"
              className="lg-field mt-2 w-full resize-none rounded-lg p-3 text-sm outline-none"
            />

            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="lg-btn lg-btn-primary mt-4 w-full px-5 py-2.5 text-sm"
            >
              {submitting ? "Sending…" : "Submit inquiry to team"}
            </button>
            <p className="mt-3 text-[11px] text-muted">
              The customization team will review feasibility. No pricing is
              shown or generated.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
