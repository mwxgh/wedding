'use client';

import type { ReactNode } from 'react';

import FadeContent from '@repo/ui/components/reactbits/fade-content';

/** Fade + un-blur a block when it scrolls into view. */
export function Reveal({ children }: { children: ReactNode }) {
  return (
    <FadeContent blur duration={900} threshold={0.15}>
      {children}
    </FadeContent>
  );
}
