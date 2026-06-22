"use client";

import type { Chat } from "./types";

export function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  onDeleteChat,
}: {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}) {
  return (
    <aside className="lg-rail flex w-64 shrink-0 flex-col border-r border-white/50">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="lg-btn lg-btn-primary w-full px-4 py-2.5 text-sm"
        >
          <span className="text-lg leading-none">＋</span> New design
        </button>
      </div>

      <p className="px-5 pb-2 text-[11px] uppercase tracking-[0.28em] text-muted">
        Your designs
      </p>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {chats.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted">
            No designs yet. Start a new one.
          </p>
        )}
        {chats.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center rounded-lg transition ${
              c.id === activeChatId
                ? "border border-white/70 bg-white/70 text-emerald shadow-sm backdrop-blur-md"
                : "border border-transparent text-charcoal hover:bg-white/45"
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
              title={c.title}
            >
              {c.title || "Untitled design"}
            </button>
            <button
              onClick={() => onDeleteChat(c.id)}
              className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition hover:bg-rose-500/10 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
              aria-label="Delete design"
              title="Delete design"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
