"use client";

import type { UiDesign } from "./types";

export function DesignOptions({
  designs,
  selectedDesignId,
  onSelect,
  onSketchOn,
}: {
  designs: UiDesign[];
  selectedDesignId?: string;
  onSelect: (d: UiDesign) => void;
  onSketchOn: (d: UiDesign) => void;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-3">
      {designs.map((d) => {
        const selected = d.id && d.id === selectedDesignId;
        return (
          <div
            key={d.optionIndex}
            className={`overflow-hidden rounded-2xl border bg-white/65 shadow-[0_16px_40px_rgba(20,55,94,0.1)] backdrop-blur-md transition ${
              selected ? "border-gold ring-1 ring-gold" : "border-white/60"
            }`}
          >
            <div className="aspect-square w-full bg-sand/50">
              {/* Procedural SVG data-URI render — plain img is simplest here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.imageUrl}
                alt={d.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-3">
              <h4 className="font-display text-lg text-emerald">{d.title}</h4>
              <button
                onClick={() => onSelect(d)}
                className={`lg-btn mt-3 w-full px-3 py-1.5 text-xs ${
                  selected ? "lg-btn-primary" : "lg-btn-ghost"
                }`}
              >
                {selected ? "Selected · review inquiry" : "Choose & inquire"}
              </button>
              <button
                onClick={() => onSketchOn(d)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition hover:text-emerald"
                title="Open this rendering in the sketch pad to doodle changes"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Sketch on this
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
