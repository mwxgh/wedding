'use client';

import { type ReactNode, useEffect, useMemo, useRef } from 'react';

import { animate, motion, useReducedMotion } from 'motion/react';

import { Card, CardContent } from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';

/** Card that rises in on mount; `index` staggers a row of them. */
export function Panel({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      // grid items default to min-width:auto; charts would push them wider
      className={cn('min-w-0', className)}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: 'easeOut' }}
    >
      <Card
        className={'h-full transition-shadow duration-300 hover:shadow-lift'}
      >
        {children}
      </Card>
    </motion.div>
  );
}

export function PanelTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Number that counts up, formatted vi-VN ("21,5", "1.234"); `decimals` keeps
 * e.g. "21,5" for compact money. Respects reduced motion.
 */
export function Count({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = useMemo(
    () => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }),
    [decimals],
  );
  const final = fmt.format(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = final;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => {
        el.textContent = fmt.format(v);
      },
    });
    return () => controls.stop();
  }, [value, fmt, final, reduce]);

  return <span ref={ref}>{final}</span>;
}

/** Ratio against a limit: the track is a lighter step of the same hue. */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  /** Accessible name, e.g. "Khách đã xác nhận". */
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const reduce = useReducedMotion();
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuetext={`${value.toLocaleString('vi-VN')}/${max.toLocaleString('vi-VN')}`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'h-2 overflow-hidden rounded-full bg-chart-1/12',
        className,
      )}
    >
      <motion.div
        className="h-full rounded-full bg-chart-1"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  );
}

/** Tiny trend line: history in the de-emphasis ink, the latest point accented. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - (v / max) * (h - 6),
  ]);
  const last = pts.at(-1)!;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-7 w-24 overflow-visible"
      aria-hidden
    >
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3.5}
        fill="var(--chart-1)"
        stroke="var(--card)"
        strokeWidth={2}
      />
    </svg>
  );
}

/** label · value · context, with an optional meter or sparkline. */
export function StatTile({
  index,
  label,
  value,
  suffix,
  decimals,
  context,
  meter,
  trend,
}: {
  index?: number;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  context?: ReactNode;
  meter?: { value: number; max: number };
  trend?: number[];
}) {
  return (
    <Panel index={index}>
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {trend && <Sparkline values={trend} />}
        </div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          <Count value={value} decimals={decimals} />
          {suffix && (
            <span className="ml-1 text-base font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
        {meter && <Meter label={label} value={meter.value} max={meter.max} />}
        {context && (
          <p className="mt-auto text-xs text-muted-foreground">{context}</p>
        )}
      </CardContent>
    </Panel>
  );
}
