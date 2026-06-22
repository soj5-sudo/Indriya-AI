import { GoogleGenAI, Type, type Content } from "@google/genai";
import type {
  AIProvider,
  AttachmentCheck,
  ChatTurnInput,
  Design,
  DesignView,
  GenerateInput,
  GenerateViewsInput,
  Attachment,
  BillOfMaterials,
} from "./types";
import { detectCategory, renderDataUri } from "./mockRender";

/**
 * Real provider backed by Google Gemini.
 * - chat(): gemini-2.5-flash (vision) — a warm Indriya concierge that can see
 *   uploaded references/sketches and guides the user's brief.
 * - generateDesigns(): gemini-2.5-flash (structured JSON) for three design
 *   specs + bills of materials, then gemini-2.5-flash-image ("nano-banana")
 *   for photorealistic, 3D renders conditioned on the user's images.
 *
 * Falls back to a procedural placeholder render only if image generation
 * returns nothing, so the flow never breaks.
 */

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

/** Fetch an image URL and return it as Gemini inlineData (base64). */
async function urlToInlineData(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/png";
    if (!mimeType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { inlineData: { mimeType, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

async function attachmentParts(attachments?: Attachment[]) {
  if (!attachments?.length) return [];
  const parts = await Promise.all(
    attachments.map((a) => urlToInlineData(a.url))
  );
  return parts.filter((p): p is NonNullable<typeof p> => p !== null);
}

const CONCIERGE_SYSTEM = `You are the Indriya Atelier concierge — a warm, refined fine-jewellery design expert for Indriya, an Aditya Birla luxury jewellery house. Help the customer shape one bespoke piece.

Ask one or two concise guiding questions at a time, covering: the piece type and occasion; metal (yellow / rose / white gold, or platinum) and purity (e.g. 18K, 22K); stones (diamond, emerald, ruby, sapphire, pearl, polki) and how prominent they should be; and the overall style.

IMAGE CHECK — if the latest message includes attached images, judge EACH one (in the order received) and fill "attachmentChecks" with one entry per image:
- usable = true if it is a piece of jewellery, or a jewellery design sketch — even a rough or simple hand drawing of a ring, pendant, earring, necklace, bangle, etc. counts — or a clearly jewellery-relevant reference.
- usable = false if it is a random scribble, blank, illegible, or unrelated to jewellery (a person, a landscape, text, etc.). Give a short reason.
If ANY attached image is unusable, do NOT set readyToRender true: warmly tell the customer that image wasn't clear enough to design from and ask them to share a clearer jewellery sketch or a relevant reference photo. Only build on the usable images.
When there are no attachments, return attachmentChecks as an empty array.

If a usable reference or sketch is attached, briefly acknowledge what you can see in it. Never discuss, estimate or invent pricing. Keep every reply under 70 words, elegant and friendly.

When you have enough to render a piece (at least: piece type + metal + stones or a clear style) AND no attached image is unusable, set readyToRender to true and warmly invite them to generate designs.`;

const DESIGN_SYSTEM = `You are a fine-jewellery design director at Indriya. From the brief and any reference/sketch images, propose EXACTLY THREE distinct design directions for the SAME piece (e.g. a classic heritage take, a contemporary minimal take, and a bold statement take).

For each direction give: a short evocative title; a detailed photorealistic render prompt that precisely describes the jewel (form, silhouette, metal colour, stones with cut and arrangement, setting style, proportions, finish); and a complete, realistic bill of materials. Stone counts and carats must be consistent with the render description. Never include pricing.`;

export const geminiProvider: AIProvider = {
  async chat({ history, message, attachments }: ChatTurnInput) {
    const ai = client();

    const imageParts = await attachmentParts(attachments);
    const count = imageParts.length;
    const note =
      count > 0
        ? `\n\n[The customer attached ${count} image(s) with this message. Assess each in order in attachmentChecks.]`
        : "";

    const contents: Content[] = history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));
    contents.push({
      role: "user",
      parts: [
        { text: (message || "(see attached image)") + note },
        ...imageParts,
      ],
    });

    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents,
      config: {
        systemInstruction: CONCIERGE_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            readyToRender: { type: Type.BOOLEAN },
            attachmentChecks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  usable: { type: Type.BOOLEAN },
                  reason: { type: Type.STRING },
                },
                required: ["usable", "reason"],
              },
            },
          },
          required: ["reply", "readyToRender", "attachmentChecks"],
        },
      },
    });

    try {
      const parsed = JSON.parse(res.text ?? "{}");
      const checks: AttachmentCheck[] = Array.isArray(parsed.attachmentChecks)
        ? parsed.attachmentChecks.map((c: { usable?: unknown; reason?: unknown }) => ({
            usable: Boolean(c.usable),
            reason: String(c.reason ?? ""),
          }))
        : [];
      return {
        reply: String(parsed.reply ?? "Could you tell me a little more about the piece?"),
        readyToRender: Boolean(parsed.readyToRender),
        attachmentChecks: checks,
      };
    } catch {
      return {
        reply:
          res.text ?? "Could you tell me a little more about the piece you'd like?",
        readyToRender: false,
        attachmentChecks: [],
      };
    }
  },

  async generateDesigns({ brief, attachments }: GenerateInput): Promise<Design[]> {
    const ai = client();
    const refParts = await attachmentParts(attachments);

    // 1) Three design specs + bills of materials (structured JSON).
    const specRes = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: `Design brief:\n${brief || "(no text brief — work from the images)"}` },
            ...refParts,
          ],
        },
      ],
      config: {
        systemInstruction: DESIGN_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            designs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  renderPrompt: { type: Type.STRING },
                  billOfMaterials: {
                    type: Type.OBJECT,
                    properties: {
                      metal: { type: Type.STRING },
                      goldColor: { type: Type.STRING },
                      goldPurity: { type: Type.STRING },
                      estimatedWeightG: { type: Type.NUMBER },
                      finish: { type: Type.STRING },
                      notes: { type: Type.STRING },
                      stones: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: { type: Type.STRING },
                            shape: { type: Type.STRING },
                            count: { type: Type.NUMBER },
                            carat: { type: Type.NUMBER },
                            setting: { type: Type.STRING },
                          },
                          required: ["type", "shape", "count", "carat"],
                        },
                      },
                    },
                    required: ["metal", "goldColor", "goldPurity", "stones"],
                  },
                },
                required: ["title", "renderPrompt", "billOfMaterials"],
              },
            },
          },
          required: ["designs"],
        },
      },
    });

    type Spec = {
      title: string;
      renderPrompt: string;
      billOfMaterials: BillOfMaterials;
    };
    let specs: Spec[] = [];
    try {
      specs = (JSON.parse(specRes.text ?? "{}").designs ?? []).slice(0, 3);
    } catch {
      specs = [];
    }
    if (specs.length === 0) {
      throw new Error("Gemini returned no design specs");
    }

    // 2) Render each spec photorealistically, in parallel.
    const designs = await Promise.all(
      specs.map(async (spec, i) => {
        const imageUrl = await renderOne(ai, spec.renderPrompt, refParts, brief, spec.billOfMaterials.goldColor, i);
        return {
          optionIndex: i,
          title: spec.title,
          imageUrl,
          billOfMaterials: spec.billOfMaterials,
        } satisfies Design;
      })
    );

    return designs;
  },

  async generateViews({
    baseImageUrl,
    billOfMaterials,
  }: GenerateViewsInput): Promise<DesignView[]> {
    const ai = client();
    const base = await urlToInlineData(baseImageUrl);
    if (!base) throw new Error("Could not load base render for views");

    const material = `${billOfMaterials.metal}, ${billOfMaterials.goldColor} gold`;

    const views = await Promise.all(
      VIEWPOINTS.map(async ({ key, instruction }) => {
        const imageUrl = await renderView(ai, base, instruction, material);
        return { view: key, imageUrl } satisfies DesignView;
      })
    );

    return views;
  },
};

const VIEWPOINTS: { key: string; instruction: string }[] = [
  { key: "top", instruction: "from directly above — a top-down plan view looking straight down onto the piece" },
  { key: "bottom", instruction: "from directly below — the underside / reverse of the piece" },
  { key: "left", instruction: "from the left side — a side profile view" },
  { key: "right", instruction: "from the right side — a side profile view" },
  { key: "inside", instruction: "a close-up of the inner surface (e.g. the inside of the band or the back where it touches the skin), showing where an engraving would sit" },
];

async function renderView(
  ai: GoogleGenAI,
  base: { inlineData: { mimeType: string; data: string } },
  instruction: string,
  material: string
): Promise<string> {
  const prompt = `${RENDER_PREAMBLE}\n\nThis is the SAME single piece of jewellery shown in the reference image (${material}). Render it ${instruction}. Keep the identical design, metal colour, stones, proportions and finish as the reference — only the camera angle changes. Same studio lighting and neutral background.`;
  try {
    const res = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, base] }],
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (p.inlineData?.data) {
        const mime = p.inlineData.mimeType ?? "image/png";
        return `data:${mime};base64,${p.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Gemini view generation failed:", (e as Error).message);
  }
  // Fall back to the base render if a particular angle can't be produced.
  return baseDataUriFallback(base);
}

function baseDataUriFallback(base: {
  inlineData: { mimeType: string; data: string };
}): string {
  return `data:${base.inlineData.mimeType};base64,${base.inlineData.data}`;
}

const RENDER_PREAMBLE =
  "Professional product photography of a single piece of fine luxury jewellery, photorealistic, three-dimensional, ultra sharp macro detail, realistic precious-metal and gemstone reflections, studio lighting with soft shadows, centred and isolated on a clean soft neutral gradient background, 8k. This is a real photographed jewel — NOT a sketch, drawing, illustration or cartoon.";

async function renderOne(
  ai: GoogleGenAI,
  renderPrompt: string,
  refParts: { inlineData: { mimeType: string; data: string } }[],
  brief: string,
  goldColor: string,
  optionIndex: number
): Promise<string> {
  try {
    const res = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: `${RENDER_PREAMBLE}\n\n${renderPrompt}` },
            ...refParts,
          ],
        },
      ],
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (p.inlineData?.data) {
        const mime = p.inlineData.mimeType ?? "image/png";
        return `data:${mime};base64,${p.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Gemini image generation failed:", (e as Error).message);
  }
  // graceful fallback so the flow never breaks
  return renderDataUri(detectCategory(brief), goldColor || "Yellow");
}
