import type { CSSProperties } from 'react';

import { cn } from '@repo/ui/lib/utils';

/** 囍 (song hỷ,"double happiness") — decorative, hidden from screen readers. */
export function SongHy({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('font-han leading-none', className)}>
      囍
    </span>
  );
}

/** Red seal with a gold double ring and a gold 囍. */
export function SongHyMedallion({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        `relative inline-flex size-20 items-center justify-center rounded-full
        bg-primary text-gold-light shadow-lift ring-4 ring-gold/40 ring-offset-4
        ring-offset-background`,
        className,
      )}
    >
      <span
        className={
          'absolute inset-1.5 rounded-full border border-gold-light/50'
        }
      />
      <SongHy className="text-[2.6em]" />
    </span>
  );
}

/** Mây cát tường — auspicious cloud scroll, drawn in currentColor. */
export function CloudMotif({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 96 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={cn('h-8 w-24', className)}
    >
      <path d="M6 26h84" />
      <path d="M14 26c-4 0-7-3-7-6.5S10 13 14 13c1-5 5-8 10-8 4 0 7 2 9 5 2-2 4-3 7-3 5 0 9 4 9 9" />
      <path d="M24 17c0-2.5 2-4.5 4.5-4.5S33 14.5 33 17s-2 4-4 4-3.2-1.4-3.2-3" />
      <path d="M82 26c4 0 7-3 7-6.5S86 13 82 13c-1-5-5-8-10-8-4 0-7 2-9 5-2-2-4-3-7-3-5 0-9 4-9 9" />
      <path d="M72 17c0-2.5-2-4.5-4.5-4.5S63 14.5 63 17s2 4 4 4 3.2-1.4 3.2-3" />
    </svg>
  );
}

/** Hồi văn (key-fret) corner; rotate it for the other corners. */
function Corner({ style }: { style?: CSSProperties }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className="absolute size-8 sm:size-10"
      style={style}
    >
      <path d="M2 38V2h36" />
      <path d="M8 32V8h24" />
      <path d="M8 20h8v-6h-4" />
      <path d="M20 8v8h-6" />
    </svg>
  );
}

/** Gold key-fret ornaments in the four corners of a`relative` parent. */
export function CornerOrnaments({
  inset = 12,
  className,
}: {
  /** Distance from the parent's edges, px. */
  inset?: number;
  className?: string;
}) {
  const at = inset;
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 text-gold',
        className,
      )}
    >
      <Corner style={{ top: at, left: at }} />
      <Corner style={{ top: at, right: at, rotate: '90deg' }} />
      <Corner style={{ bottom: at, right: at, rotate: '180deg' }} />
      <Corner style={{ bottom: at, left: at, rotate: '270deg' }} />
    </div>
  );
}

/** Gold hairline – 囍 – hairline. */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex items-center justify-center gap-3 text-gold',
        className,
      )}
    >
      <span
        className={
          'h-px w-14 bg-gradient-to-r from-transparent to-gold sm:w-20'
        }
      />
      <SongHy className="text-base" />
      <span
        className={
          'h-px w-14 bg-gradient-to-l from-transparent to-gold sm:w-20'
        }
      />
    </span>
  );
}

/** Faint repeating cloud pattern for paper-like backgrounds. */
const CLOUD_TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="#b8892b" stroke-width="1" stroke-linecap="round" opacity="0.5"><path d="M20 50c-4 0-7-3-7-6.5S16 37 20 37c1-5 5-8 10-8 4 0 7 2 9 5 2-2 4-3 7-3 5 0 9 4 9 9"/><path d="M30 41c0-2.5 2-4.5 4.5-4.5S39 38.5 39 41s-2 4-4 4-3.2-1.4-3.2-3"/><path d="M80 14c-3 0-5-2-5-4.5S77 5 80 5c.7-3.5 3.5-5.5 7-5.5"/></svg>`,
);

export function PatternBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 opacity-[0.14]',
        className,
      )}
      style={{ backgroundImage: `url("data:image/svg+xml,${CLOUD_TILE}")` }}
    />
  );
}

/**
 * Line-art flower sprig in currentColor — a blooming branch with leaves and
 * berries, drawn for card corners. Mirror it with `-scale-x-100`.
 */
export function FlowerSprig({ className }: { className?: string }) {
  const blossom = (cx: number, cy: number, r: number) => (
    <g key={`${cx}-${cy}`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={cx}
          cy={cy - r}
          rx={r * 0.55}
          ry={r}
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="currentColor" />
    </g>
  );
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 150"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-36 w-24', className)}
    >
      {/* main stem and side branches */}
      <path d="M8 146C22 112 34 84 70 18" />
      <path d="M30 98c12-4 22-14 28-30" />
      <path d="M44 72c-8-6-12-16-12-28" />
      <path d="M22 120c-10-2-16-8-18-18" />
      {/* leaves */}
      <path d="M26 108c-12 0-20-8-20-18 10 0 18 7 20 18z" />
      <path d="M40 84c2-12 10-19 20-19-1 10-9 18-20 19z" />
      <path d="M52 56c-10-5-13-14-10-23 9 4 13 13 10 23z" />
      <path d="M16 132c-9 3-15 0-17-6 7-3 14 0 17 6z" />
      {blossom(70, 18, 6)}
      {blossom(58, 66, 5)}
      {blossom(32, 44, 4.5)}
      {/* berries */}
      {[
        [78, 34],
        [82, 26],
        [64, 44],
        [36, 60],
        [10, 98],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="1.6"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
