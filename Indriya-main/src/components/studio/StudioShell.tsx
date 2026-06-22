"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/ai/types";
import type { Chat, UiDesign, UiMessage } from "./types";
import { ChatSidebar } from "./ChatSidebar";
import { ChatPanel } from "./ChatPanel";
import { Composer } from "./Composer";
import { InquiryPanel } from "./InquiryPanel";

export function StudioShell({ initialChats }: { initialChats: Chat[] }) {
  const supabase = useRef(createClient()).current;

  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialChats[0]?.id ?? null
  );
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [readyToRender, setReadyToRender] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<UiDesign | null>(null);
  // A rendering the user chose to doodle on (loaded into the sketch pad).
  const [sketchSeed, setSketchSeed] = useState<string | null>(null);

  /** Load messages + their designs for a chat. */
  const loadMessages = useCallback(
    async (chatId: string) => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role, content, attachments")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      const ids = (msgs ?? []).map((m) => m.id);
      let designs: {
        id: string;
        message_id: string;
        option_index: number;
        title: string | null;
        image_url: string;
        bill_of_materials: UiDesign["billOfMaterials"];
      }[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("designs")
          .select("id, message_id, option_index, title, image_url, bill_of_materials")
          .in("message_id", ids)
          .order("option_index", { ascending: true });
        designs = data ?? [];
      }

      const ui: UiMessage[] = (msgs ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content ?? "",
        attachments: (m.attachments as Attachment[]) ?? [],
        designs: designs
          .filter((d) => d.message_id === m.id)
          .map((d) => ({
            id: d.id,
            optionIndex: d.option_index,
            title: d.title ?? `Option ${d.option_index + 1}`,
            imageUrl: d.image_url,
            billOfMaterials: d.bill_of_materials,
          })) as UiDesign[],
      }));
      setMessages(ui);
      setSelectedDesign(null);
      setReadyToRender(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId);
    else setMessages([]);
  }, [activeChatId, loadMessages]);

  /**
   * Inserts a chat row. user_id must be set explicitly — the column is NOT NULL
   * and the RLS policy requires auth.uid() = user_id, so we attach the current
   * user's id here.
   */
  async function createChat(): Promise<Chat | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("chats")
      .insert({ title: "New design", user_id: user.id })
      .select("id, title, created_at")
      .single();
    if (error || !data) {
      console.error("Could not create chat:", error?.message);
      return null;
    }
    return data;
  }

  async function newChat() {
    const data = await createChat();
    if (!data) return;
    setChats((c) => [data, ...c]);
    setActiveChatId(data.id);
    setMessages([]);
    setSelectedDesign(null);
    setReadyToRender(false);
  }

  /** Permanently delete a chat. The DB cascades messages, designs & inquiries. */
  async function deleteChat(id: string) {
    if (
      !window.confirm(
        "Delete this design and its history? This cannot be undone."
      )
    ) {
      return;
    }
    const remaining = chats.filter((c) => c.id !== id);
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) {
      console.error("Could not delete chat:", error.message);
      return;
    }
    setChats(remaining);
    if (activeChatId === id) {
      const nextId = remaining[0]?.id ?? null;
      setActiveChatId(nextId);
      if (!nextId) {
        setMessages([]);
        setSelectedDesign(null);
        setReadyToRender(false);
      }
    }
  }

  /** Ensure we have a chat to post into; returns its id. */
  async function ensureChat(): Promise<string | null> {
    if (activeChatId) return activeChatId;
    const data = await createChat();
    if (!data) return null;
    setChats((c) => [data, ...c]);
    setActiveChatId(data.id);
    return data.id;
  }

  async function sendMessage(text: string, attachments: Attachment[]) {
    const chatId = await ensureChat();
    if (!chatId) return;
    setLoading(true);

    // optimistic user message
    setMessages((m) => [
      ...m,
      {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: text,
        attachments,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: text, attachments }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((m) => [
          ...m,
          { id: data.assistantMessageId, role: "assistant", content: data.reply },
        ]);
        setReadyToRender(Boolean(data.readyToRender));
      }
      // refresh chat title in sidebar
      setChats((cs) =>
        cs.map((c) =>
          c.id === chatId && c.title === "New design"
            ? { ...c, title: text.slice(0, 60) || c.title }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateDesigns() {
    const chatId = activeChatId;
    if (!chatId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      const data = await res.json();
      if (data.designs) {
        setMessages((m) => [
          ...m,
          {
            id: data.messageId,
            role: "assistant",
            content:
              "Here are three directions for your piece, each with its full bill of materials.",
            designs: data.designs as UiDesign[],
          },
        ]);
        setReadyToRender(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNewChat={newChat}
        onDeleteChat={deleteChat}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatPanel
          messages={messages}
          loading={loading}
          selectedDesignId={selectedDesign?.id}
          onSelectDesign={setSelectedDesign}
          onSketchOn={(d) => setSketchSeed(d.imageUrl)}
          onFoundationSubmit={(text) => sendMessage(text, [])}
        />
        <Composer
          disabled={loading}
          readyToRender={readyToRender}
          onSend={sendMessage}
          onGenerate={generateDesigns}
          canGenerate={messages.some((m) => m.role === "user")}
          sketchSeed={sketchSeed}
          onSketchSeedConsumed={() => setSketchSeed(null)}
        />
      </main>

      {selectedDesign && activeChatId && (
        <InquiryPanel
          chatId={activeChatId}
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
          onSubmitted={(d) =>
            setMessages((m) => [
              ...m,
              {
                id: `bom-${Date.now()}`,
                role: "assistant",
                content: `Inquiry sent to the customization team. Here is the full bill of materials for ${d.title}.`,
                bom: d.billOfMaterials,
                bomTitle: d.title,
              },
            ])
          }
        />
      )}
    </div>
  );
}
