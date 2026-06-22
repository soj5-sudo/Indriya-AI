import type { BillOfMaterials, Attachment } from "@/lib/ai/types";

export type Chat = {
  id: string;
  title: string;
  created_at: string;
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  /** Designs anchored to this assistant message, if any. */
  designs?: UiDesign[];
  /** A bill-of-materials summary to render under this message, if any. */
  bom?: BillOfMaterials;
  bomTitle?: string;
};

export type UiDesign = {
  id?: string;
  optionIndex: number;
  title: string;
  imageUrl: string;
  billOfMaterials: BillOfMaterials;
};
