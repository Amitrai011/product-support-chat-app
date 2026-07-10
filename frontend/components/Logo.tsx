export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border text-sm"
        style={{
          borderColor: 'var(--color-gold)',
          color: 'var(--color-gold)',
          fontFamily: 'var(--font-serif)',
        }}
      >
        L
      </span>
      {!compact && (
        <div className="leading-tight">
          <div
            className="lux-heading text-lg tracking-wide"
            style={{ color: 'var(--color-ivory)' }}
          >
            Luxe
          </div>
          <div
            className="text-[0.6rem] uppercase tracking-[0.3em]"
            style={{ color: 'var(--color-gold)' }}
          >
            Concierge
          </div>
        </div>
      )}
    </div>
  );
}
