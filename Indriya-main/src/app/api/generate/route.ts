import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { persistRender } from "@/lib/supabase/persistRender";
import type { Attachment } from "@/lib/ai/types";

// Image generation can take a while — allow up to a minute.
export const maxDuration = 60;

/**
 * Generates three design options for a chat and persists them as an assistant
 * message + linked design rows. Returns the designs (with their DB ids) so the
 * client can render the cards and let the user pick one for an inquiry.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    chatId: string;
    attachments?: Attachment[];
  };
  if (!body.chatId) {
    return NextResponse.json({ error: "missing chatId" }, { status: 400 });
  }

  // Assemble the brief AND gather every reference/sketch from the conversation,
  // so the renders are conditioned on the images the user uploaded or drew.
  const { data: prior } = await supabase
    .from("messages")
    .select("role, content, attachments")
    .eq("chat_id", body.chatId)
    .order("created_at", { ascending: true });

  const brief = (prior ?? [])
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .filter(Boolean)
    .join("\n");

  // Collect attachments across all user messages, plus any sent with this call.
  // Skip any image the concierge flagged as unusable (ok === false).
  const fromHistory = (prior ?? []).flatMap(
    (m) => (m.attachments as Attachment[] | null) ?? []
  );
  const attachments = [...fromHistory, ...(body.attachments ?? [])].filter(
    (a) => a?.url && a.ok !== false
  );

  const ai = getAIProvider();
  const designs = await ai.generateDesigns({ brief, attachments });

  // Persist an assistant message that anchors these designs.
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      chat_id: body.chatId,
      role: "assistant",
      content: "Here are three directions for your piece — each with its full bill of materials.",
    })
    .select("id")
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 400 });
  }

  // Move raster renders into storage and keep only the URL in the DB.
  const persisted = await Promise.all(
    designs.map(async (d) => ({
      ...d,
      imageUrl: await persistRender(supabase, user.id, d.imageUrl),
    }))
  );

  const { data: rows, error: dErr } = await supabase
    .from("designs")
    .insert(
      persisted.map((d) => ({
        message_id: msg.id,
        option_index: d.optionIndex,
        title: d.title,
        image_url: d.imageUrl,
        bill_of_materials: d.billOfMaterials,
      }))
    )
    .select("id, option_index, title, image_url, bill_of_materials");

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 400 });
  }

  const merged = persisted.map((d) => {
    const row = rows?.find((r) => r.option_index === d.optionIndex);
    return { ...d, id: row?.id };
  });

  return NextResponse.json({ messageId: msg.id, designs: merged });
}
