"use client";

import { useState } from "react";

/**
 * Optional starting point for a new design. None of these are required — they
 * just compose a first brief and drop it into the conversation so the atelier
 * has a foundation to build on. Customers can ignore it and type or sketch.
 */
const FIELDS = [
  {
    key: "type",
    label: "Piece",
    options: [
      "Ring",
      "Studs",
      "Earrings",
      "Pendant",
      "Necklace",
      "Bracelet",
      "Bangle",
      "Nose pin",
      "Chain",
    ],
  },
  { key: "metal", label: "Metal", options: ["Gold", "Platinum", "Silver"] },
  { key: "colour", label: "Colour", options: ["Yellow", "Rose", "White"] },
  { key: "karat", label: "Karat", options: ["14K", "18K", "22K"] },
  {
    key: "carats",
    label: "Diamonds",
    options: ["0.25 ct", "0.50 ct", "1 ct", "2 ct", "3 ct+"],
  },
  { key: "size", label: "Size", options: ["Petite", "Standard", "Statement"] },
] as const;

type Key = (typeof FIELDS)[number]["key"];

export function DesignFoundation({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [sel, setSel] = useState<Partial<Record<Key, string>>>({});
  const chosen = Object.values(sel).filter(Boolean).length;

  function compose() {
    const metal = [sel.karat, sel.colour, sel.metal].filter(Boolean).join(" ");
    let s = `I'd like ${sel.type ? `a ${sel.type.toLowerCase()}` : "a piece"}`;
    if (metal) s += ` in ${metal.toLowerCase()}`;
    if (sel.carats) s += ` set with ${sel.carats.toLowerCase()} of diamonds`;
    if (sel.size) s += `, ${sel.size.toLowerCase()} size`;
    onSubmit(`${s}.`);
  }

  return (
    <div className="mt-7">
      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.26em] text-muted">
        Optional · start from a template
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="sr-only">{f.label}</span>
            <select
              value={sel[f.key] ?? ""}
              onChange={(e) =>
                setSel((s) => ({ ...s, [f.key]: e.target.value }))
              }
              className="lg-select w-full"
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button
          onClick={compose}
          disabled={disabled || chosen === 0}
          className="lg-btn lg-btn-primary px-6 py-2 text-sm"
        >
          Start with these
        </button>
      </div>
    </div>
  );
}
