'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { formatTime } from '../lib/format';
import type { Message, TypingEvent, User } from '../lib/types';
import { Avatar } from './Avatar';

interface Props {
  conversationId: string;
  socket: Socket | null;
  currentUser: User;
  /** Compact spacing for the smaller floating customer window. */
  dense?: boolean;
}

/**
 * A single live conversation: loads history over REST, subscribes to the
 * conversation's Socket.IO room, renders messages, relays typing indicators,
 * and sends new messages. Multiple instances can be mounted at once (each
 * filters realtime events by its own conversationId), which is what lets a
 * customer keep several product chats open simultaneously.
 */
export function ChatThread({ conversationId, socket, currentUser, dense }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingName, setTypingName] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history on mount. Consumers give each conversation a stable identity
  // (the agent view remounts via `key`, customer windows are per-conversation),
  // so the initial `loading` state covers the switch without an in-effect reset.
  useEffect(() => {
    let active = true;
    api
      .getMessages(conversationId)
      .then((m) => {
        if (active) setMessages(m);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  // Subscribe to the room + realtime events for this conversation.
  useEffect(() => {
    if (!socket) return;

    socket.emit('conversation:join', { conversationId });

    const onMessage = (m: Message) => {
      if (m.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m],
      );
    };

    const onTyping = (e: TypingEvent) => {
      if (e.conversationId !== conversationId) return;
      if (e.userId === currentUser.id) return;
      setTypingName(e.isTyping ? e.name : null);
      if (clearTypingTimer.current) clearTimeout(clearTypingTimer.current);
      if (e.isTyping) {
        clearTypingTimer.current = setTimeout(() => setTypingName(null), 3500);
      }
    };

    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
    };
  }, [socket, conversationId, currentUser.id]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingName]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit('typing', { conversationId, isTyping });
    },
    [socket, conversationId],
  );

  function onDraftChange(value: string) {
    setDraft(value);
    emitTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1500);
  }

  function send() {
    const content = draft.trim();
    if (!content || !socket) return;
    socket.emit('message:send', { conversationId, content });
    setDraft('');
    emitTyping(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div
        className={`flex-1 space-y-3 overflow-y-auto ${dense ? 'p-3' : 'p-5'}`}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-faint">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">
            No messages yet. Say hello 👋
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === currentUser.id;
            const showMeta =
              i === 0 || messages[i - 1].senderId !== m.senderId;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}
              >
                {!dense && (
                  <div className="w-8">
                    {showMeta && !mine && (
                      <Avatar name={m.sender.name} role={m.senderRole} size={32} />
                    )}
                  </div>
                )}
                <div className={`max-w-[78%] ${mine ? 'items-end' : ''}`}>
                  {showMeta && (
                    <div
                      className={`mb-1 flex items-center gap-2 text-[0.68rem] text-faint ${
                        mine ? 'justify-end' : ''
                      }`}
                    >
                      <span className="text-muted">
                        {mine ? 'You' : m.sender.name}
                      </span>
                      {m.senderRole === 'agent' && !mine && (
                        <span className="rounded-full border border-hair px-1.5 py-px text-[0.6rem] uppercase tracking-wider text-gold">
                          Agent
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                    style={
                      mine
                        ? {
                            background:
                              'linear-gradient(180deg, var(--color-gold-soft), var(--color-gold))',
                            color: '#1c150b',
                            borderBottomRightRadius: 4,
                          }
                        : {
                            backgroundColor: 'var(--color-panel-2)',
                            border: '1px solid var(--color-hair)',
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    {m.content}
                    <span
                      className="ml-2 align-bottom text-[0.6rem] opacity-60"
                      style={{ color: mine ? '#3a2e15' : 'var(--color-faint)' }}
                    >
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typingName && (
          <p className="pl-2 text-xs italic text-faint">
            {typingName} is typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: 'var(--color-hair)' }}
      >
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          className="lux-input flex-1"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="lux-btn lux-btn-gold px-4 py-2.5"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
