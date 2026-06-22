"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = [
  "#1b2230",
  "#5b7790",
  "#b08d57",
  "#0b4d3b",
  "#2f6fb0",
  "#c0405a",
  "#ffffff",
];
const W = 1000;
const H = 680;
const MAX_UNDO = 30;

type Tool = "pen" | "eraser" | "move";

/**
 * A professional, Procreate-style drawing surface. Two stacked canvases (a
 * backdrop layer + a transparent ink layer) live on a pannable / zoomable
 * stage. Floating liquid-glass controls hold the tools, a glass brush slider
 * and the colour palette. On finish both layers flatten into one PNG.
 */
export function SketchCanvas({
  backgroundUrl,
  onDone,
  onCancel,
}: {
  backgroundUrl?: string;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const undoStack = useRef<ImageData[]>([]);

  // pan / zoom of the stage
  const panRef = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(
    null
  );

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(5);
  const [canUndo, setCanUndo] = useState(false);

  panRef.current = pan;

  // Paint the backdrop layer (white paper + optional faint reference).
  useEffect(() => {
    const ctx = bgRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (backgroundUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.globalAlpha = 0.5;
        const ratio = Math.min(W / img.width, H / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        ctx.globalAlpha = 1;
      };
      img.src = backgroundUrl;
    }
  }, [backgroundUrl]);

  function canvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function pushUndo() {
    const ctx = drawRef.current?.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, W, H);
    undoStack.current.push(snap);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setCanUndo(true);
  }

  function undo() {
    const ctx = drawRef.current?.getContext("2d");
    const snap = undoStack.current.pop();
    if (!ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
    setCanUndo(undoStack.current.length > 0);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "move") {
      panStart.current = {
        px: e.clientX,
        py: e.clientY,
        ox: panRef.current.x,
        oy: panRef.current.y,
      };
      return;
    }
    pushUndo();
    drawing.current = true;
    const ctx = drawRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // a dot for taps
    ctx.lineTo(x + 0.01, y + 0.01);
    applyStroke(ctx);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "move" && panStart.current) {
      const s = panStart.current;
      setPan({ x: s.ox + (e.clientX - s.px), y: s.oy + (e.clientY - s.py) });
      return;
    }
    if (!drawing.current) return;
    const ctx = drawRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = canvasPos(e);
    ctx.lineTo(x, y);
    applyStroke(ctx);
  }

  function applyStroke(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 2.4;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = size;
      ctx.strokeStyle = color;
    }
    ctx.stroke();
  }

  function onPointerUp() {
    drawing.current = false;
    panStart.current = null;
  }

  function clearAll() {
    const ctx = drawRef.current?.getContext("2d");
    if (!ctx) return;
    pushUndo();
    ctx.clearRect(0, 0, W, H);
  }

  function recenter() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  function done() {
    const flat = document.createElement("canvas");
    flat.width = W;
    flat.height = H;
    const ctx = flat.getContext("2d");
    if (!ctx || !bgRef.current || !drawRef.current) return;
    ctx.drawImage(bgRef.current, 0, 0);
    ctx.drawImage(drawRef.current, 0, 0);
    flat.toBlob((blob) => blob && onDone(blob), "image/png");
  }

  // wheel to zoom the stage
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 1) return;
    setZoom((z) => clamp(z - e.deltaY * 0.0015, 0.4, 3));
  }

  const cursor =
    tool === "move" ? "grab" : tool === "eraser" ? "cell" : "crosshair";

  if (typeof document === "undefined") return null;

  // Portal to <body>: the composer has a backdrop-filter, which would otherwise
  // trap this fixed overlay inside that bar instead of the viewport.
  return createPortal(
    <div
      className="sketch-veil fixed inset-0 z-[60] overflow-hidden"
      onWheel={onWheel}
    >
      {/* stage */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative shadow-[0_40px_120px_rgba(8,24,48,0.45)]"
          style={{
            width: "min(78vw, 920px)",
            aspectRatio: `${W} / ${H}`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: drawing.current ? "none" : "transform 0.12s ease-out",
          }}
        >
          <canvas
            ref={bgRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full rounded-2xl bg-white"
          />
          <canvas
            ref={drawRef}
            width={W}
            height={H}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-0 h-full w-full touch-none rounded-2xl"
            style={{ cursor }}
          />
        </div>
      </div>

      {/* top-left title */}
      <div className="lg-panel absolute left-5 top-5 rounded-2xl px-4 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold">
          Indriya Atelier
        </p>
        <p className="font-display text-sm text-emerald">
          {backgroundUrl ? "Doodle over your design" : "Sketch your idea"}
        </p>
      </div>

      {/* top-right actions */}
      <div className="absolute right-5 top-5 flex gap-2">
        <button onClick={onCancel} className="lg-btn lg-btn-ghost px-4 py-2 text-sm">
          Cancel
        </button>
        <button onClick={done} className="lg-btn lg-btn-primary px-5 py-2 text-sm">
          Attach sketch
        </button>
      </div>

      {/* left tool rail */}
      <div className="lg-panel absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl p-2">
        <ToolButton
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          label="Pen"
        >
          <PenIcon />
        </ToolButton>
        <ToolButton
          active={tool === "eraser"}
          onClick={() => setTool("eraser")}
          label="Eraser"
        >
          <EraserIcon />
        </ToolButton>
        <ToolButton
          active={tool === "move"}
          onClick={() => setTool("move")}
          label="Move canvas"
        >
          <HandIcon />
        </ToolButton>
        <div className="my-1 h-px bg-line" />
        <ToolButton active={false} onClick={undo} label="Undo" disabled={!canUndo}>
          <UndoIcon />
        </ToolButton>
        <ToolButton active={false} onClick={clearAll} label="Clear all">
          <ClearIcon />
        </ToolButton>
      </div>

      {/* bottom control dock */}
      <div className="lg-panel absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-2xl px-5 py-3">
        {/* brush size */}
        <div className="flex items-center gap-3">
          <span
            className="rounded-full bg-charcoal/80"
            style={{
              width: Math.max(6, Math.min(size, 26)),
              height: Math.max(6, Math.min(size, 26)),
            }}
          />
          <input
            type="range"
            min={1}
            max={40}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="lg-slider w-40"
            title="Brush size"
            aria-label="Brush size"
          />
          <span className="w-6 text-xs tabular-nums text-muted">{size}</span>
        </div>

        <div className="h-6 w-px bg-line" />

        {/* colours */}
        <div
          className={`flex gap-1.5 ${tool === "eraser" ? "opacity-40" : ""}`}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              style={{ background: c }}
              className={`h-7 w-7 rounded-full border transition ${
                color === c && tool === "pen"
                  ? "border-white ring-2 ring-gold"
                  : "border-line hover:scale-110"
              }`}
              aria-label={`colour ${c}`}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-line" />

        {/* zoom + recenter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => clamp(z - 0.2, 0.4, 3))}
            className="lg-icon h-8 w-8 text-base"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => clamp(z + 0.2, 0.4, 3))}
            className="lg-icon h-8 w-8 text-base"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={recenter}
            className="lg-icon ml-1 h-8 w-8"
            aria-label="Recenter canvas"
            title="Recenter"
          >
            <RecenterIcon />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function ToolButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition disabled:opacity-35 ${
        active
          ? "bg-gradient-to-b from-[#2a3446] to-[#141c2a] text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "text-muted hover:bg-white/60 hover:text-emerald"
      }`}
    >
      {children}
    </button>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PenIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function EraserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M20 20H7L3 16a2 2 0 0 1 0-3L13 3a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-9 9" />
      <path d="M9.5 9.5 16 16" />
    </svg>
  );
}
function HandIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M18 11V6a1.5 1.5 0 0 0-3 0M15 6V4.5a1.5 1.5 0 0 0-3 0V6M12 6V5a1.5 1.5 0 0 0-3 0v7" />
      <path d="M9 12V8a1.5 1.5 0 0 0-3 0v6a7 7 0 0 0 7 7h1a6 6 0 0 0 6-6v-3" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M9 7H4V2" />
      <path d="M4 7a8 8 0 1 1-1.6 4.8" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function RecenterIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
