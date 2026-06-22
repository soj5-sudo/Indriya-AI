import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import type { Attachment } from "@/lib/ai/types";

/**
 * One guided assistant turn. Persists the user message + assistant reply to the
 * given chat (which must belong to the signed-in user — RLS enforces this).
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
    message: string;
    attachments?: Attachment[];
  };

  if (!body.chatId || (!body.message && !body.attachments?.length)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Load prior messages for context (RLS scopes this to the user's chats).
  const { data: prior } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", body.chatId)
    .order("created_at", { ascending: true });

  const history =
    (prior ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content ?? "",
    })) ?? [];

  // Assess the turn first — this also judges whether each attached image is a
  // usable jewelry sketch/reference, so we can tag (and later ignore) any that
  // aren't before they pollute a design brief.
  const ai = getAIProvider();
  const { reply, readyToRender, attachmentChecks } = await ai.chat({
    history,
    message: body.message ?? "",
    attachments: body.attachments,
  });

  // Tag each attachment with its usability verdict (defaults to ok if no check).
  const incoming = body.attachments ?? [];
  const taggedAttachments = incoming.map((a, i) => ({
    ...a,
    ok: attachmentChecks[i]?.usable ?? true,
  }));
  const rejectedCount = taggedAttachments.filter((a) => a.ok === false).length;

  // Persist the user's message (keeping the images, tagged with their verdict).
  const { data: userMsg, error: userErr } = await supabase
    .from("messages")
    .insert({
      chat_id: body.chatId,
      role: "user",
      content: body.message ?? "",
      attachments: taggedAttachments,
    })
    .select("id")
    .single();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 400 });
  }

  // Set the chat title from the first user message.
  if (history.length === 0 && body.message) {
    await supabase
      .from("chats")
      .update({ title: body.message.slice(0, 60) })
      .eq("id", body.chatId);
  }

  const { data: aiMsg, error: aiErr } = await supabase
    .from("messages")
    .insert({ chat_id: body.chatId, role: "assistant", content: reply })
    .select("id")
    .single();

  if (aiErr) {
    return NextResponse.json({ error: aiErr.message }, { status: 400 });
  }

  return NextResponse.json({
    userMessageId: userMsg.id,
    assistantMessageId: aiMsg.id,
    reply,
    readyToRender,
    rejectedCount,
  });
}
