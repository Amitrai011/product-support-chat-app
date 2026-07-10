"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { Avatar } from "../../components/Avatar";
import { ChatThread } from "../../components/ChatThread";
import { ProductImage } from "../../components/ProductImage";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { formatPrice, formatRelative } from "../../lib/format";
import type { Conversation } from "../../lib/types";
import { useSocket } from "../../lib/use-socket";

export default function AgentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  // Route guard.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "agent") router.replace("/customer");
  }, [user, loading, router]);

  // Initial load of all threads.
  useEffect(() => {
    if (!user) return;
    api
      .listConversations()
      .then((list) => {
        setConversations(list);
        if (list.length && !selectedId) setSelectedId(list[0].id);
      })
      .catch(() => setConversations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live list updates: upsert + re-sort by most recent activity.
  useEffect(() => {
    if (!socket) return;
    const onUpdated = (summary: Conversation) => {
      setConversations((prev) => {
        const without = prev.filter((c) => c.id !== summary.id);
        return [summary, ...without].sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime(),
        );
      });
      // Flag unread if it's not the thread we're currently viewing and the
      // latest message came from the customer.
      setSelectedId((cur) => {
        if (
          summary.id !== cur &&
          summary.lastMessage?.senderRole === "customer"
        ) {
          setUnread((u) => new Set(u).add(summary.id));
        }
        return cur;
      });
    };
    socket.on("conversation:updated", onUpdated);
    return () => {
      socket.off("conversation:updated", onUpdated);
    };
  }, [socket]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setUnread((u) => {
      const next = new Set(u);
      next.delete(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.product.name.toLowerCase().includes(q) ||
        c.customer.name.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="lux-eyebrow animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader connected={connected} subtitle="Concierge Desk" />

      <div className="flex min-h-0 flex-1">
        {/* Conversation list */}
        <aside
          className="flex w-85 shrink-0 flex-col border-r"
          style={{ borderColor: "var(--color-hair)" }}
        >
          <div
            className="border-b p-4"
            style={{ borderColor: "var(--color-hair)" }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="lux-heading text-xl text-ivory">Conversations</h2>
              <span className="text-xs text-gold">{conversations.length}</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product or customer…"
              className="lux-input text-sm"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-faint">
                No conversations yet.
              </p>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId;
                const hasUnread = unread.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: "var(--color-hair)",
                      backgroundColor: active
                        ? "var(--color-panel-2)"
                        : "transparent",
                    }}
                  >
                    <ProductImage
                      src={c.product.imageUrl}
                      alt={c.product.name}
                      className="h-11 w-11 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-ivory">
                          {c.product.name}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-faint">
                          {formatRelative(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="truncate text-xs text-gold-soft">
                        {c.customer.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs text-muted">
                          {c.lastMessage
                            ? `${c.lastMessage.senderRole === "agent" ? "You: " : ""}${c.lastMessage.content}`
                            : "New conversation"}
                        </span>
                        {hasUnread && (
                          <span
                            className="ml-auto h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: "var(--color-gold)" }}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Selected thread */}
        <section className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div
                className="flex items-center gap-3 border-b px-5 py-3"
                style={{ borderColor: "var(--color-hair)" }}
              >
                <ProductImage
                  src={selected.product.imageUrl}
                  alt={selected.product.name}
                  className="h-11 w-11 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="lux-heading truncate text-lg text-ivory">
                    {selected.product.name}
                  </div>
                  <div className="text-xs text-gold">
                    {formatPrice(
                      selected.product.priceCents,
                      selected.product.currency,
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="text-right leading-tight">
                    <div className="text-sm text-ivory">
                      {selected.customer.name}
                    </div>
                    <div className="text-[0.65rem] text-muted">
                      {selected.customer.email}
                    </div>
                  </div>
                  <Avatar
                    name={selected.customer.name}
                    role="customer"
                    size={36}
                  />
                </div>
              </div>

              <ChatThread
                key={selected.id}
                conversationId={selected.id}
                socket={socket}
                currentUser={user}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="lux-eyebrow">Concierge Desk</p>
              <p className="max-w-xs text-muted">
                Select a conversation to view the thread. New customer messages
                appear here in real time.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
