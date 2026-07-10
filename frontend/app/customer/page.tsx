'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { ChatWindow } from '../../components/ChatWindow';
import { ProductImage } from '../../components/ProductImage';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { formatPrice } from '../../lib/format';
import type { Conversation, Product } from '../../lib/types';
import { useSocket } from '../../lib/use-socket';

interface OpenWindow {
  conversation: Conversation;
  minimized: boolean;
}

export default function CustomerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();

  const [products, setProducts] = useState<Product[]>([]);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

  // Route guard.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'customer') router.replace('/agent');
  }, [user, loading, router]);

  // Load catalogue.
  useEffect(() => {
    if (!user) return;
    api.listProducts().then(setProducts).catch(() => setProducts([]));
  }, [user]);

  const openChat = useCallback(
    async (product: Product) => {
      // If a window for this product is already open, just surface it.
      const existing = windows.find((w) => w.conversation.productId === product.id);
      if (existing) {
        setWindows((prev) =>
          prev.map((w) =>
            w.conversation.productId === product.id
              ? { ...w, minimized: false }
              : w,
          ),
        );
        return;
      }
      setOpening(product.id);
      try {
        const conversation = await api.openConversation(product.id);
        setWindows((prev) => [{ conversation, minimized: false }, ...prev]);
      } finally {
        setOpening(null);
      }
    },
    [windows],
  );

  function closeWindow(id: string) {
    setWindows((prev) => prev.filter((w) => w.conversation.id !== id));
  }
  function toggleMinimize(id: string) {
    setWindows((prev) =>
      prev.map((w) =>
        w.conversation.id === id ? { ...w, minimized: !w.minimized } : w,
      ),
    );
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="lux-eyebrow animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader connected={connected} subtitle="The Collection" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <div className="mb-10">
          <p className="lux-eyebrow mb-3">Maison Luxe · Private Client</p>
          <h1 className="lux-heading text-4xl text-ivory">The Collection</h1>
          <p className="mt-3 max-w-xl text-muted">
            Browse our pieces and speak with a concierge about any of them. Each
            product opens its own private conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isOpen = windows.some(
              (w) => w.conversation.productId === product.id,
            );
            return (
              <article
                key={product.id}
                className="lux-panel group flex flex-col overflow-hidden rounded-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.category && (
                    <span
                      className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.6rem] uppercase tracking-widest"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-ink) 70%, transparent)',
                        color: 'var(--color-gold)',
                        border: '1px solid var(--color-hair)',
                      }}
                    >
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="lux-heading text-xl text-ivory">
                    {product.name}
                  </h3>
                  {product.tagline && (
                    <p className="mt-1 text-sm text-gold-soft">
                      {product.tagline}
                    </p>
                  )}
                  <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted">
                    {product.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="lux-heading text-lg text-ivory">
                      {formatPrice(product.priceCents, product.currency)}
                    </span>
                    <button
                      onClick={() => openChat(product)}
                      disabled={opening === product.id}
                      className="lux-btn lux-btn-gold px-4 py-2 text-sm"
                    >
                      {opening === product.id
                        ? 'Opening…'
                        : isOpen
                          ? 'Open chat'
                          : 'Chat with Agent'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Floating chat dock */}
      <div className="pointer-events-none fixed bottom-0 right-4 z-40 flex items-end gap-3">
        {windows.map((w) => (
          <ChatWindow
            key={w.conversation.id}
            conversation={w.conversation}
            socket={socket}
            currentUser={user}
            minimized={w.minimized}
            onToggleMinimize={() => toggleMinimize(w.conversation.id)}
            onClose={() => closeWindow(w.conversation.id)}
          />
        ))}
      </div>
    </div>
  );
}
