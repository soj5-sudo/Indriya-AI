"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cinematic intro: a cloud of icy "diamond" particles drifts in and coalesces
 * into the Indriya gazelle, sparkles, then fades to reveal the site — purely
 * presentational. Plays once per browser session, honours reduced-motion, and
 * fails open (removes itself immediately) if anything is unavailable.
 */
type Particle = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  tw: number;
};

const GATHER = 1750;
const HOLD = 750;
const FADE = 850;
const MAX_POINTS = 3200;

export function LogoReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Plays on every load / refresh (only skipped for reduced-motion users).
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setRemoved(true);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      setRemoved(true);
      return;
    }

    let cancelled = false;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    // soft round glow sprite (drawn many times with additive blending)
    const SP = 28;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = SP;
    const sctx = sprite.getContext("2d");
    if (!sctx) {
      setRemoved(true);
      return;
    }
    const grad = sctx.createRadialGradient(
      SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.22, "rgba(224,241,255,0.92)");
    grad.addColorStop(0.55, "rgba(150,200,242,0.34)");
    grad.addColorStop(1, "rgba(120,180,235,0)");
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(SP / 2, SP / 2, SP / 2, 0, Math.PI * 2);
    sctx.fill();

    function applySize() {
      W = window.innerWidth;
      H = window.innerHeight;
      if (!canvas) return;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    applySize();

    let particles: Particle[] = [];

    function buildParticles(img: HTMLImageElement) {
      const targetH = Math.min(H * 0.46, 420);
      const scale = targetH / img.height;
      const dw = Math.ceil(img.width * scale);
      const dh = Math.ceil(img.height * scale);

      const off = document.createElement("canvas");
      off.width = dw;
      off.height = dh;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0, dw, dh);
      const data = octx.getImageData(0, 0, dw, dh).data;

      const ox = (W - dw) / 2;
      const oy = (H - dh) / 2;

      const targets: { x: number; y: number }[] = [];
      const step = 2;
      for (let y = 0; y < dh; y += step) {
        for (let x = 0; x < dw; x += step) {
          if (data[(y * dw + x) * 4 + 3] > 70) {
            targets.push({ x: ox + x, y: oy + y });
          }
        }
      }
      // even down-sample to keep the frame light
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }
      const chosen = targets.slice(0, MAX_POINTS);

      const reach = Math.max(W, H);
      particles = chosen.map((t) => {
        const ang = Math.random() * Math.PI * 2;
        const rad = reach * (0.42 + Math.random() * 0.55);
        const sx = W / 2 + Math.cos(ang) * rad;
        const sy = H / 2 + Math.sin(ang) * rad * 0.7;
        return {
          x: sx,
          y: sy,
          sx,
          sy,
          tx: t.x + (Math.random() - 0.5) * 1.4,
          ty: t.y + (Math.random() - 0.5) * 1.4,
          size: 0.5 + Math.random() * 1.5,
          delay: Math.random() * 0.45,
          tw: Math.random() * Math.PI * 2,
        };
      });
    }

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let start = 0;

    function frame(now: number) {
      if (cancelled) return;
      const t = now - start;
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      for (const p of particles) {
        const span = 1 - p.delay * 0.55;
        const local = Math.min(1, Math.max(0, (t / GATHER - p.delay) / span));
        const e = easeOutCubic(local);
        const x = p.sx + (p.tx - p.sx) * e;
        const y = p.sy + (p.ty - p.sy) * e;

        const settled = t > GATHER;
        const twinkle = settled
          ? 0.62 + 0.5 * Math.sin(p.tw + now * 0.006)
          : 0.4 + 0.6 * e;
        const s = p.size * (2.4 + twinkle * 2.6);
        ctx!.globalAlpha = Math.min(1, 0.32 + twinkle * 0.7);
        ctx!.drawImage(sprite, x - s / 2, y - s / 2, s, s);
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      buildParticles(img);
      if (!particles.length) {
        setRemoved(true);
        return;
      }
      start = performance.now();
      raf = requestAnimationFrame(frame);
    };
    img.onerror = () => setRemoved(true);
    img.src = "/indriya-gazelle.png";

    const hideTimer = window.setTimeout(() => setHidden(true), GATHER + HOLD);
    const removeTimer = window.setTimeout(
      () => setRemoved(true),
      GATHER + HOLD + FADE
    );
    window.addEventListener("resize", applySize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      window.removeEventListener("resize", applySize);
    };
  }, []);

  if (removed) return null;
  return (
    <div
      className={`logo-reveal ${hidden ? "logo-reveal--hidden" : ""}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="logo-reveal__canvas" />
    </div>
  );
}
