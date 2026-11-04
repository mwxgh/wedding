import { cn } from 'cn';

const HEART =
  'M12 21s-7.5-4.6-9.6-9.3C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.2C19.5 16.4 12 21 12 21z';

// left %, size px, delay s, duration s, colour — fixed so SSR and client match
const HEARTS: [number, number, number, number, string][] = [
  [6, 14, 0, 15, '#e8b4a8'],
  [14, 10, 4, 18, '#c9a25c'],
  [23, 16, 9, 16, '#a63846'],
  [34, 9, 2, 20, '#e8b4a8'],
  [46, 12, 11, 17, '#c9a25c'],
  [57, 15, 6, 19, '#a63846'],
  [66, 10, 1, 16, '#e8b4a8'],
  [74, 13, 13, 18, '#c9a25c'],
  [83, 17, 5, 21, '#a63846'],
  [92, 11, 8, 15, '#e8b4a8'],
];

/**
 * Hearts drifting up through a `relative` parent (hidden under reduced
 * motion). Decorative only.
 */
export function FloatingHearts({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      {HEARTS.map(([left, size, delay, duration, color], i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute -bottom-6 animate-float-up motion-reduce:hidden"
          style={{
            left: `${left}%`,
            width: size,
            height: size,
            color,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
          fill="currentColor"
        >
          <path d={HEART} />
        </svg>
      ))}
    </div>
  );
}
