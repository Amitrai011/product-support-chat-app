'use client';

import type { Socket } from 'socket.io-client';
import { formatPrice } from '../lib/format';
import type { Conversation, User } from '../lib/types';
import { ChatThread } from './ChatThread';
import { ProductImage } from './ProductImage';

/**
 * A floating, dockable chat window for the customer. Each open product chat is
 * an independent window with its own live thread. Windows can be minimized to a
 * header bar or closed.
 */
export function ChatWindow({
  conversation,
  socket,
  currentUser,
  minimized,
  onToggleMinimize,
  onClose,
}: {
  conversation: Conversation;
  socket: Socket | null;
  currentUser: User;
  minimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}) {
  const { product } = conversation;

  return (
    <div
      className="pointer-events-auto flex w-[340px] flex-col overflow-hidden rounded-t-xl shadow-2xl"
      style={{
        height: minimized ? 'auto' : '460px',
        backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-hair)',
        borderBottom: 'none',
      }}
    >
      {/* Window header */}
      <button
        onClick={onToggleMinimize}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
        style={{
          backgroundColor: 'var(--color-panel-2)',
          borderBottom: minimized ? 'none' : '1px solid var(--color-hair)',
        }}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-ivory">{product.name}</div>
          <div className="truncate text-[0.68rem] text-gold">
            {formatPrice(product.priceCents, product.currency)} · Concierge
          </div>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded p-1 text-faint hover:text-ivory"
          aria-label="Close chat"
          role="button"
        >
          ✕
        </span>
      </button>

      {!minimized && (
        <ChatThread
          conversationId={conversation.id}
          socket={socket}
          currentUser={currentUser}
          dense
        />
      )}
    </div>
  );
}
