import { initials } from '../lib/format';

export function Avatar({
  name,
  role,
  size = 40,
}: {
  name: string;
  role?: 'customer' | 'agent';
  size?: number;
}) {
  const isAgent = role === 'agent';
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-medium select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        color: isAgent ? '#1c150b' : 'var(--color-gold-soft)',
        background: isAgent
          ? 'linear-gradient(180deg, var(--color-gold-soft), var(--color-gold))'
          : 'var(--color-panel-2)',
        border: isAgent ? 'none' : '1px solid var(--color-hair)',
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
