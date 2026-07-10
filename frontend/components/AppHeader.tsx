'use client';

import { useAuth } from '../lib/auth-context';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

export function AppHeader({
  connected,
  subtitle,
}: {
  connected?: boolean;
  subtitle?: string;
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b px-5 py-3 backdrop-blur"
      style={{
        borderColor: 'var(--color-hair)',
        backgroundColor: 'color-mix(in srgb, var(--color-ink) 82%, transparent)',
      }}
    >
      <div className="flex items-center gap-4">
        <Logo />
        {subtitle && (
          <span className="hidden text-sm text-muted sm:inline">· {subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span
          className="flex items-center gap-2 text-xs text-muted"
          title={connected ? 'Live connection active' : 'Reconnecting…'}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: connected ? '#7bb661' : 'var(--color-faint)',
              boxShadow: connected ? '0 0 8px #7bb661' : 'none',
            }}
          />
          {connected ? 'Live' : 'Offline'}
        </span>

        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} role={user.role} size={34} />
          <div className="hidden leading-tight sm:block">
            <div className="text-sm text-ivory">{user.name}</div>
            <div className="text-[0.65rem] uppercase tracking-widest text-gold">
              {user.role}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="lux-btn lux-btn-ghost px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
