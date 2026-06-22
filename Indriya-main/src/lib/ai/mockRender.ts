/**
 * Procedural placeholder jewellery renders.
 *
 * These stand in for real AI image generation during the trial. Each render is
 * a self-contained SVG returned as a data-URI, so there are no binary assets to
 * manage and every design option looks distinct (different silhouette, metal
 * tone and stone colour).
 */

export type Category =
  | "ring"
  | "pendant"
  | "earrings"
  | "bracelet"
  | "bangle"
  | "necklace";

type Palette = {
  metal: string;
  metalDark: string;
  stone: string;
  stoneLight: string;
};

const GOLD: Palette = {
  metal: "#d9b870",
  metalDark: "#b08d57",
  stone: "#8fd3c2",
  stoneLight: "#d6f3ec",
};
const ROSE: Palette = {
  metal: "#e3b7a0",
  metalDark: "#c08868",
  stone: "#e79bb0",
  stoneLight: "#f7dbe4",
};
const WHITE: Palette = {
  metal: "#dadde2",
  metalDark: "#aeb3bc",
  stone: "#9ec9f0",
  stoneLight: "#dcecfb",
};

export const PALETTES: Record<string, Palette> = {
  Yellow: GOLD,
  Rose: ROSE,
  White: WHITE,
};

function gem(cx: number, cy: number, r: number, p: Palette) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r + 1.5}" fill="${p.metalDark}" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.stone}" />
      <circle cx="${cx - r / 3}" cy="${cy - r / 3}" r="${r / 2.4}" fill="${p.stoneLight}" opacity="0.85" />
    </g>`;
}

function band(p: Palette, accent: string) {
  return `<defs>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.metal}" />
      <stop offset="0.5" stop-color="${p.metalDark}" />
      <stop offset="1" stop-color="${p.metal}" />
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#ffffff" />
      <stop offset="1" stop-color="${accent}" />
    </radialGradient>
  </defs>`;
}

function shape(category: Category, p: Palette): string {
  switch (category) {
    case "ring":
      return `
        <ellipse cx="200" cy="240" rx="92" ry="96" fill="none" stroke="url(#metal)" stroke-width="20" />
        <path d="M140 150 Q200 90 260 150 L240 180 Q200 140 160 180 Z" fill="url(#metal)" />
        ${gem(200, 138, 26, p)}
        ${gem(160, 168, 9, p)}${gem(240, 168, 9, p)}`;
    case "pendant":
    case "necklace":
      return `
        <path d="M70 120 Q200 250 330 120" fill="none" stroke="url(#metal)" stroke-width="8" />
        <path d="M200 200 l46 46 l-46 46 l-46 -46 Z" fill="url(#metal)" stroke="${p.metalDark}" stroke-width="3"/>
        ${gem(200, 246, 22, p)}
        ${gem(200, 196, 7, p)}`;
    case "earrings":
      return `
        <g transform="translate(-46,0)">
          <circle cx="200" cy="150" r="10" fill="none" stroke="url(#metal)" stroke-width="6"/>
          <path d="M200 160 l30 40 l-30 40 l-30 -40 Z" fill="url(#metal)"/>
          ${gem(200, 200, 18, p)}
        </g>
        <g transform="translate(46,0)">
          <circle cx="200" cy="150" r="10" fill="none" stroke="url(#metal)" stroke-width="6"/>
          <path d="M200 160 l30 40 l-30 40 l-30 -40 Z" fill="url(#metal)"/>
          ${gem(200, 200, 18, p)}
        </g>`;
    case "bracelet":
    case "bangle":
      return `
        <ellipse cx="200" cy="240" rx="120" ry="64" fill="none" stroke="url(#metal)" stroke-width="22" />
        ${gem(200, 178, 16, p)}
        ${gem(150, 196, 9, p)}${gem(250, 196, 9, p)}
        ${gem(120, 240, 7, p)}${gem(280, 240, 7, p)}`;
  }
}

export function renderDataUri(category: Category, goldColor: string): string {
  const p = PALETTES[goldColor] ?? GOLD;
  const accent = p.stoneLight;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    ${band(p, accent)}
    <rect width="400" height="400" fill="url(#bg)" />
    <circle cx="200" cy="210" r="150" fill="#ffffff" opacity="0.35" />
    ${shape(category, p)}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/\b(ring|band|solitaire|engagement)\b/.test(t)) return "ring";
  if (/\b(earring|stud|jhumka|drop)\b/.test(t)) return "earrings";
  if (/\b(bracelet|tennis)\b/.test(t)) return "bracelet";
  if (/\b(bangle|kada|kangan)\b/.test(t)) return "bangle";
  if (/\b(necklace|chain|haar|choker)\b/.test(t)) return "necklace";
  if (/\b(pendant|locket)\b/.test(t)) return "pendant";
  return "pendant";
}
