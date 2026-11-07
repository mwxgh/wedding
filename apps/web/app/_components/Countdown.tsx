'use client';

import { useEffect, useState } from 'react';

import Counter from '@repo/ui/components/reactbits/counter';

const UNITS = [
  ['Ngày', 86_400_000],
  ['Giờ', 3_600_000],
  ['Phút', 60_000],
  ['Giây', 1_000],
] as const;

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // same-size placeholder until mounted, so the hero does not jump
  if (now === null) {
    return <div aria-hidden className="mt-10 h-[78px] sm:h-[86px]" />;
  }
  let diff = Math.max(0, new Date(target).getTime() - now);
  if (diff === 0) return null;

  // Screen readers get one stable sentence (minutes, not seconds); the
  // rolling digits (10 spans per place) are hidden from them
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  return (
    <div className="mt-10 flex justify-center gap-2.5 sm:gap-4">
      <p className="sr-only">
        Còn {days} ngày {hours} giờ {minutes} phút đến ngày cưới
      </p>
      {UNITS.map(([label, ms]) => {
        const value = Math.floor(diff / ms);
        diff -= value * ms;
        return (
          <div
            key={label}
            aria-hidden
            className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl
            border border-border/70 bg-card/80 px-2 py-3 shadow-soft
            backdrop-blur-md sm:min-w-20 sm:py-4`}
          >
            <Counter
              value={value}
              places={value >= 100 ? [100, 10, 1] : [10, 1]}
              fontSize={32}
              gap={2}
              horizontalPadding={4}
              textColor="var(--rose-deep)"
              fontWeight={500}
              gradientFrom="var(--card)"
              gradientHeight={8}
              counterStyle={{ fontFamily: 'var(--font-playfair), serif' }}
            />
            <span
              className={`text-xs font-medium tracking-[0.15em]
              text-muted-foreground uppercase`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
