"use client";

import { useEffect, useRef } from "react";
import type { UiDesign, UiMessage } from "./types";
import { DesignOptions } from "./DesignOptions";
import { BillOfMaterialsCard } from "./BillOfMaterialsCard";
import { DesignFoundation } from "./DesignFoundation";

export function ChatPanel({
  messages,
  loading,
  selectedDesignId,
  onSelectDesign,
  onSketchOn,
  onFoundationSubmit,
}: {
  messages: UiMessage[];
  loading: boolean;
  selectedDesignId?: string;
  onSelectDesign: (d: UiDesign) => void;
  onSketchOn: (d: UiDesign) => void;
  onFoundationSubmit: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {messages.length === 0 && (
          <EmptyState
            onFoundationSubmit={onFoundationSubmit}
            disabled={loading}
          />
        )}

        {messages.map((m) => (
          <div key={m.id} className="mb-6">
            {m.role === "assistant" ? (
              <AssistantBubble message={m} />
            ) : (
              <UserBubble message={m} />
            )}

            {m.designs && m.designs.length > 0 && (
              <DesignOptions
                designs={m.designs}
                selectedDesignId={selectedDesignId}
                onSelect={onSelectDesign}
                onSketchOn={onSketchOn}
              />
            )}

            {m.bom && <BillOfMaterialsCard bom={m.bom} title={m.bomTitle} />}
          </div>
        ))}

        {loading && (
          <div className="mb-6 flex items-center gap-2.5 text-sm text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <span className="tracking-wide">The atelier is working…</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

function EmptyState({
  onFoundationSubmit,
  disabled,
}: {
  onFoundationSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="lg-panel mx-auto mt-10 max-w-xl rounded-3xl p-9 text-center">
      <p className="text-[11px] uppercase tracking-[0.34em] text-gold">
        Indriya Atelier
      </p>
      <p className="mt-3 font-display text-[1.8rem] leading-tight text-emerald">
        Let&apos;s design your Dream Jewellery
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Describe the piece you imagine, upload a reference photo, or open the
        sketch pad to draw or doodle. When your brief is ready, the atelier will
        present three options with full details.
      </p>

      <DesignFoundation onSubmit={onFoundationSubmit} disabled={disabled} />
    </div>
  );
}

function AssistantBubble({ message }: { message: UiMessage }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.3em] text-gold">
        Atelier
      </p>
      <div className="rounded-2xl rounded-tl-sm border border-white/60 bg-white/70 px-5 py-3.5 text-sm leading-relaxed text-charcoal shadow-[0_12px_30px_rgba(20,55,94,0.08)] backdrop-blur-md">
        {message.content}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: UiMessage }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-2xl rounded-2xl rounded-tr-sm border border-white/15 bg-gradient-to-b from-emerald-soft to-emerald px-4 py-3 text-sm leading-relaxed text-cream shadow-[0_12px_28px_rgba(20,55,94,0.24)]">
        {message.content}
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {message.attachments.map((a, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.type}
                className={`h-20 w-20 rounded-lg border object-cover ${
                  a.ok === false
                    ? "border-rose-300 opacity-50 grayscale"
                    : "border-line"
                }`}
              />
              {a.ok === false && (
                <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-rose-600/80 px-1 py-0.5 text-center text-[9px] text-white">
                  not used
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
