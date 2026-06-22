export type Stone = {
  type: string; // e.g. "Diamond", "Emerald"
  shape: string; // e.g. "Round Brilliant", "Pear"
  count: number;
  carat: number; // total carat for this group
  setting?: string; // e.g. "Prong", "Pavé", "Bezel"
};

export type BillOfMaterials = {
  metal: string; // e.g. "18K Gold"
  goldColor: string; // e.g. "Yellow", "Rose", "White"
  goldPurity: string; // e.g. "18K", "22K"
  estimatedWeightG?: number; // metal weight in grams (no cost)
  stones: Stone[];
  finish?: string; // e.g. "High polish", "Matte"
  notes?: string;
};

export type Design = {
  optionIndex: number;
  title: string;
  imageUrl: string;
  billOfMaterials: BillOfMaterials;
};

export type Attachment = {
  type: "reference" | "sketch";
  url: string;
  /**
   * Whether the image passed the jewelry-relevance check. `false` means it was
   * judged unusable (random scribble / unrelated photo) and must be ignored
   * when assembling a design brief. Undefined = not yet assessed / accepted.
   */
  ok?: boolean;
};

/** Per-image verdict from the concierge's vision check, in input order. */
export type AttachmentCheck = {
  usable: boolean;
  reason: string;
};

export type ChatTurnInput = {
  /** Full conversation so far (user + assistant turns). */
  history: { role: "user" | "assistant"; content: string }[];
  /** The latest user message text. */
  message: string;
  /** Any images attached to the latest message. */
  attachments?: Attachment[];
};

export type GenerateInput = {
  /** The design brief assembled from the conversation. */
  brief: string;
  attachments?: Attachment[];
};

/** A single viewpoint of a finished design. */
export type DesignView = {
  view: string; // "front" | "top" | "bottom" | "left" | "right" | "inside"
  imageUrl: string;
};

export type GenerateViewsInput = {
  /** The existing front rendering to keep every other view consistent with. */
  baseImageUrl: string;
  brief: string;
  billOfMaterials: BillOfMaterials;
};

export interface AIProvider {
  /** One guided assistant turn that helps the user refine their brief. */
  chat(input: ChatTurnInput): Promise<{
    reply: string;
    readyToRender: boolean;
    /** One entry per attached image (input order); empty when none attached. */
    attachmentChecks: AttachmentCheck[];
  }>;
  /** Returns exactly three design options with bill of materials. */
  generateDesigns(input: GenerateInput): Promise<Design[]>;
  /**
   * Generates additional viewpoints (top, bottom, left, right, inside) of an
   * already-rendered design, kept visually consistent with its front render.
   */
  generateViews(input: GenerateViewsInput): Promise<DesignView[]>;
}
