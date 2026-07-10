'use client';

import { useState } from 'react';

/**
 * Product image with a graceful gold-monogram fallback if the remote image
 * fails to load (e.g. offline). Uses a plain <img> to avoid remote-domain
 * configuration for next/image.
 */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center ${className ?? ''}`}
        style={{
          background:
            'radial-gradient(120% 120% at 30% 20%, var(--color-panel-2), var(--color-ink))',
        }}
      >
        <span
          className="lux-heading text-3xl"
          style={{ color: 'var(--color-gold)' }}
        >
          {alt.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? ''}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
