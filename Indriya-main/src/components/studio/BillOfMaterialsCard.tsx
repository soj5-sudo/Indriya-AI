"use client";

import type { BillOfMaterials } from "@/lib/ai/types";

/**
 * Read-only summary of a design's bill of materials — metal, gold weight,
 * stones and diamond carats. Shared by the chat thread and the inquiry panel
 * so the customer sees the same figures that go to the team.
 */
export function BillOfMaterialsCard({
  bom,
  title,
}: {
  bom: BillOfMaterials;
  title?: string;
}) {
  const diamondCt = bom.stones
    .filter((s) => /diamond/i.test(s.type))
    .reduce((sum, s) => sum + (s.carat || 0), 0);
  const totalCt = bom.stones.reduce((sum, s) => sum + (s.carat || 0), 0);

  return (
    <div className="mt-3 max-w-2xl rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_30px_rgba(20,55,94,0.08)] backdrop-blur-md">
      <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">
        Bill of materials{title ? ` · ${title}` : ""}
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Spec label="Metal" value={bom.metal} />
        <Spec label="Gold colour" value={bom.goldColor} />
        <Spec label="Purity" value={bom.goldPurity} />
        {bom.estimatedWeightG != null && (
          <Spec label="Gold weight" value={`${bom.estimatedWeightG} g`} />
        )}
        {totalCt > 0 && (
          <Spec label="Total stones" value={`${round(totalCt)} ct`} />
        )}
        {diamondCt > 0 && (
          <Spec label="Diamonds" value={`${round(diamondCt)} ct`} />
        )}
        {bom.finish && <Spec label="Finish" value={bom.finish} />}
      </dl>

      {bom.stones.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.24em] text-muted">
            Stones
          </p>
          <ul className="space-y-1">
            {bom.stones.map((s, i) => (
              <li key={i} className="text-[13px] text-charcoal">
                <span className="text-muted">{s.count}×</span> {s.type} ·{" "}
                {s.shape} · {round(s.carat)} ct
                {s.setting ? ` · ${s.setting}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bom.notes && (
        <p className="mt-3 border-t border-line pt-3 text-[13px] leading-relaxed text-muted">
          {bom.notes}
        </p>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-medium text-charcoal">{value}</dd>
    </div>
  );
}

function round(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}
