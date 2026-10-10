'use client';

import { useMemo } from 'react';

import type { PublicPhoto } from '@repo/contracts';
import Masonry from '@repo/ui/components/reactbits/masonry';

// Photos have no stored dimensions yet; vary heights for a masonry rhythm
const HEIGHTS = [520, 680, 600, 760, 560, 640];

export function Gallery({ photos }: { photos: PublicPhoto[] }) {
  const items = useMemo(
    () =>
      photos.map((p, i) => ({
        id: p.id,
        img: p.url,
        url: p.url,
        height: HEIGHTS[i % HEIGHTS.length]!,
      })),
    [photos],
  );

  return (
    <Masonry
      items={items}
      animateFrom="bottom"
      stagger={0.04}
      scaleOnHover
      hoverScale={0.97}
      blurToFocus
    />
  );
}
