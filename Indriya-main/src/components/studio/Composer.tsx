"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/ai/types";
import { uploadToDesigns } from "@/lib/supabase/upload";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { SketchCanvas } from "./SketchCanvas";

export function Composer({
  disabled,
  readyToRender,
  onSend,
  onGenerate,
  canGenerate,
  sketchSeed,
  onSketchSeedConsumed,
}: {
  disabled: boolean;
  readyToRender: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onGenerate: () => void;
  /** Whether there's enough conversation to allow a (forced) generation. */
  canGenerate: boolean;
  /** A chosen rendering to doodle on — opens the sketch pad with it loaded. */
  sketchSeed?: string | null;
  onSketchSeedConsumed?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSketch, setShowSketch] = useState(false);
  const [forceWarn, setForceWarn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Voice dictation → flows straight into the textarea (and on to the LLM).
  const {
    supported: speechSupported,
    listening,
    toggle: toggleDictation,
    stop: stopDictation,
  } = useSpeechToText(setText);

  // When a rendering is chosen to sketch on, open the pad with it as backdrop.
  useEffect(() => {
    if (sketchSeed) setShowSketch(true);
  }, [sketchSeed]);

  // A specific reference the user tapped "sketch on this" for.
  const [sketchOnUrl, setSketchOnUrl] = useState<string | null>(null);

  // Backdrop priority: a chosen rendering, a tapped reference, else the most
  // recent reference image.
  const sketchBackground =
    sketchSeed ??
    sketchOnUrl ??
    [...attachments].reverse().find((a) => a.type === "reference")?.url;

  function closeSketch() {
    setShowSketch(false);
    setSketchOnUrl(null);
    onSketchSeedConsumed?.();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToDesigns(file, file.name.split(".").pop() || "png");
    if (url) setAttachments((a) => [...a, { type: "reference", url }]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSketch(blob: Blob) {
    closeSketch();
    setUploading(true);
    const url = await uploadToDesigns(blob, "png");
    if (url) setAttachments((a) => [...a, { type: "sketch", url }]);
    setUploading(false);
  }

  function submit() {
    if (disabled || uploading) return;
    if (listening) stopDictation();
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
  }

  return (
    <div className="lg-rail shrink-0 border-t border-white/50 px-4 py-4 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {readyToRender ? (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-emerald/5 px-4 py-2">
            <span className="text-sm text-emerald">
              Your brief looks complete.
            </span>
            <button
              onClick={onGenerate}
              disabled={disabled}
              className="lg-btn lg-btn-primary px-5 py-1.5 text-sm"
            >
              ✨ Generate 3 designs
            </button>
          </div>
        ) : (
          canGenerate &&
          (forceWarn ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-2">
              <span className="text-sm text-amber-800">
                The brief still looks thin. Designs may come out less accurate.
                Generate anyway?
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setForceWarn(false)}
                  className="rounded-full border border-amber-300 px-3 py-1.5 text-xs text-amber-800 transition hover:bg-amber-100"
                >
                  Keep refining
                </button>
                <button
                  onClick={() => {
                    setForceWarn(false);
                    onGenerate();
                  }}
                  disabled={disabled}
                  className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  Generate anyway
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3 text-right">
              <button
                onClick={() => setForceWarn(true)}
                disabled={disabled}
                className="text-xs text-muted underline-offset-2 transition hover:text-amber-700 hover:underline disabled:opacity-60"
              >
                In a hurry? Generate 3 designs now →
              </button>
            </div>
          ))
        )}

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.type}
                  className="h-16 w-16 rounded-lg border border-line object-cover"
                />
                <span className="absolute -bottom-1 left-0 rounded bg-charcoal/70 px-1 text-[9px] text-cream">
                  {a.type}
                </span>
                {a.type === "reference" && (
                  <button
                    onClick={() => {
                      setSketchOnUrl(a.url);
                      setShowSketch(true);
                    }}
                    className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-cream shadow"
                    aria-label="Sketch on this reference"
                    title="Sketch on this reference"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() =>
                    setAttachments((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-charcoal text-[10px] text-cream"
                  aria-label="remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="lg-field flex items-end gap-2 rounded-2xl p-2">
          <div className="flex gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <IconButton
              title="Upload a reference image"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon />
            </IconButton>
            <IconButton
              title="Sketch or doodle"
              onClick={() => setShowSketch(true)}
            >
              <PencilIcon />
            </IconButton>
            {speechSupported && (
              <IconButton
                title={listening ? "Stop dictation" : "Dictate with your voice"}
                onClick={() => toggleDictation(text)}
                active={listening}
              >
                <MicIcon />
              </IconButton>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={
              listening
                ? "Listening… speak your idea"
                : "Describe your jewel, or the changes you'd like…"
            }
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted"
          />

          <button
            onClick={submit}
            disabled={disabled || uploading}
            className="lg-btn lg-btn-primary px-5 py-2 text-sm"
          >
            {uploading ? "…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          Indriya internal tool · designs &amp; inquiries are private to your account
        </p>
      </div>

      {showSketch && (
        <SketchCanvas
          backgroundUrl={sketchBackground}
          onDone={handleSketch}
          onCancel={closeSketch}
        />
      )}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  active = false,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      data-active={active}
      className="lg-icon relative flex h-9 w-9"
    >
      {children}
      {active && (
        <span className="absolute right-0.5 top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
