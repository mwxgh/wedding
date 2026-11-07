'use client';

import type { ReactNode } from 'react';

import { motion } from 'motion/react';

/**
 * Fade a block in when it scrolls into view. Under reduced motion the CSS
 * overrides keep it visible and still (no JS check, so SSR markup matches).
 */
export function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="motion-reduce:[transform:none]! motion-reduce:opacity-100!"
    >
      {children}
    </motion.div>
  );
}
