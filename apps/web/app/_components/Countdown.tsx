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

  if (now === null) return null;
  let diff = Math.max(0, new Date(target).getTime() - now);
  if (diff === 0) return null;

  return (
    <div className="mt-8 flex justify-center gap-3">
      {UNITS.map(([label, ms]) => {
        const value = Math.floor(diff / ms);
        diff -= value * ms;
        return (
          <div
            key={label}
            className={`flex min-w-18 flex-col items-center rounded-2xl border
            bg-card px-2 py-3 shadow-soft`}
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
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
