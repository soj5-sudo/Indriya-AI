import type {
  AIProvider,
  ChatTurnInput,
  Design,
  DesignView,
  GenerateInput,
  GenerateViewsInput,
  Stone,
} from "./types";
import { detectCategory, renderDataUri, type Category } from "./mockRender";

/**
 * Mock AI provider used during the trial. No external API key required.
 * - chat(): a warm, guided concierge that nudges the user toward a complete
 *   brief (occasion, metal, stones, style) and signals when it has enough.
 * - generateDesigns(): always returns three distinct options with a full bill
 *   of materials (no pricing) and a procedural placeholder render.
 */

function lastUserCount(history: ChatTurnInput["history"]): number {
  return history.filter((h) => h.role === "user").length;
}

function mentions(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

const STONE_WORDS = [
  "diamond",
  "emerald",
  "ruby",
  "sapphire",
  "pearl",
  "polki",
  "stone",
  "gem",
];
const METAL_WORDS = ["gold", "platinum", "rose", "white gold", "yellow", "22k", "18k"];

export const mockProvider: AIProvider = {
  async chat({ message, history, attachments }: ChatTurnInput) {
    const turns = lastUserCount(history) + 1;
    const all = history.map((h) => h.content).join(" ") + " " + message;
    const hasMetal = mentions(all, METAL_WORDS);
    const hasStones = mentions(all, STONE_WORDS);
    const hasImage = (attachments?.length ?? 0) > 0;

    // The mock provider can't actually see images — accept them as usable.
    const attachmentChecks = (attachments ?? []).map(() => ({
      usable: true,
      reason: "accepted",
    }));

    // First reply — welcome + first guiding question
    if (turns <= 1) {
      const seenImage = hasImage
        ? "Lovely — I can see your reference. "
        : "";
      return {
        reply:
          `${seenImage}Welcome to the Indriya atelier. I'd love to help you shape this piece. ` +
          `To begin: what is the occasion, and is this a ring, pendant, earrings, necklace or bangle?`,
        readyToRender: false,
        attachmentChecks,
      };
    }

    if (!hasMetal) {
      return {
        reply:
          "Beautiful. Which metal would you like — yellow, rose or white gold (or platinum)? " +
          "And a preferred purity, say 18K or 22K?",
        readyToRender: false,
        attachmentChecks,
      };
    }

    if (!hasStones) {
      return {
        reply:
          "Noted. Shall we set any stones — diamonds, emeralds, rubies, sapphires or pearls? " +
          "Tell me roughly how prominent you'd like them.",
        readyToRender: false,
        attachmentChecks,
      };
    }

    // Enough detail gathered
    return {
      reply:
        "Wonderful — I have a clear picture now. I'll prepare three design directions for you, " +
        "each with its full bill of materials. Tap “Generate 3 designs” whenever you're ready.",
      readyToRender: true,
      attachmentChecks,
    };
  },

  async generateDesigns({ brief }: GenerateInput): Promise<Design[]> {
    const category: Category = detectCategory(brief);
    const wantsEmerald = mentions(brief, ["emerald"]);
    const wantsRuby = mentions(brief, ["ruby"]);
    const wantsPearl = mentions(brief, ["pearl"]);

    const primaryStone = wantsEmerald
      ? "Emerald"
      : wantsRuby
        ? "Ruby"
        : wantsPearl
          ? "Pearl"
          : "Diamond";

    const directions: {
      title: string;
      goldColor: string;
      goldPurity: string;
      finish: string;
      weight: number;
      stones: Stone[];
      notes: string;
    }[] = [
      {
        title: "Classic Heritage",
        goldColor: "Yellow",
        goldPurity: "22K",
        finish: "High polish",
        weight: 8.4,
        stones: [
          { type: primaryStone, shape: "Round Brilliant", count: 1, carat: 0.75, setting: "Prong" },
          { type: "Diamond", shape: "Round", count: 12, carat: 0.36, setting: "Pavé" },
        ],
        notes: "Timeless silhouette with a single hero stone and a pavé halo.",
      },
      {
        title: "Contemporary Minimal",
        goldColor: "White",
        goldPurity: "18K",
        finish: "Matte with polished edges",
        weight: 6.1,
        stones: [
          { type: primaryStone, shape: "Emerald Cut", count: 1, carat: 0.9, setting: "Bezel" },
        ],
        notes: "Clean lines, a bezel-set centre stone — understated and modern.",
      },
      {
        title: "Statement Couture",
        goldColor: "Rose",
        goldPurity: "18K",
        finish: "High polish",
        weight: 11.2,
        stones: [
          { type: primaryStone, shape: "Pear", count: 1, carat: 1.1, setting: "Prong" },
          { type: "Diamond", shape: "Marquise", count: 6, carat: 0.54, setting: "Prong" },
          { type: "Diamond", shape: "Round", count: 28, carat: 0.7, setting: "Pavé" },
        ],
        notes: "A bold, layered composition for a true centrepiece.",
      },
    ];

    return directions.map((d, i) => ({
      optionIndex: i,
      title: d.title,
      imageUrl: renderDataUri(category, d.goldColor),
      billOfMaterials: {
        metal: d.goldColor === "White" ? "18K White Gold" : `${d.goldPurity} Gold`,
        goldColor: d.goldColor,
        goldPurity: d.goldPurity,
        estimatedWeightG: d.weight,
        stones: d.stones,
        finish: d.finish,
        notes: d.notes,
      },
    }));
  },

  async generateViews({
    brief,
    billOfMaterials,
  }: GenerateViewsInput): Promise<DesignView[]> {
    // Mock can't truly re-angle a render — return tinted placeholders per view.
    const category: Category = detectCategory(brief);
    const color = billOfMaterials.goldColor || "Yellow";
    return ["top", "bottom", "left", "right", "inside"].map((view) => ({
      view,
      imageUrl: renderDataUri(category, color),
    }));
  },
};
