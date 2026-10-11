'use client';

import { useMemo } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import type { Dashboard } from '@repo/contracts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@repo/ui/components/chart';

/*
 * Chart conventions (dataviz skill): 2px lines, bars <= 24px with a 4px
 * rounded data end and square baseline, a 2px surface-colored gap between
 * touching segments, hairline solid grid, text in text tokens (never in the
 * series color), legend for 2+ series and a tooltip on every mark.
 */

const GAP = { stroke: 'var(--card)', strokeWidth: 2 } as const;
const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

// ---------- activity over time ----------

const activityConfig = {
  responded: { label: 'Đã phản hồi', color: 'var(--chart-1)' },
  opened: { label: 'Đã mở thiệp', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Cumulative opens and RSVPs per day: two series, one shared axis. */
export function ActivityChart({
  timeline,
}: {
  timeline: Dashboard['timeline'];
}) {
  const data = useMemo(() => {
    let opened = 0;
    let responded = 0;
    return timeline.map((d) => {
      opened += d.opened;
      responded += d.responded;
      return { date: d.date, opened, responded };
    });
  }, [timeline]);
  const last = data.length - 1;

  // direct label at each line's end only, never on every point
  const endLabel =
    (key: 'opened' | 'responded') =>
    ({
      x,
      y,
      index,
    }: {
      x?: number | string;
      y?: number | string;
      index?: number;
    }) =>
      index === last ? (
        <text
          x={Number(x) + 8}
          y={Number(y)}
          dy={4}
          fontSize={12}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {data[last]?.[key]}
        </text>
      ) : null;

  return (
    <ChartContainer config={activityConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 8, right: 36, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tick={AXIS_TICK}
          tickFormatter={shortDate}
        />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={AXIS_TICK}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(v) => `Ngày ${shortDate(String(v))}`}
            />
          }
        />
        <ChartLegend
          content={<ChartLegendContent />}
          verticalAlign="top"
          itemSorter={null}
        />
        {(['opened', 'responded'] as const).map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, ...GAP }}
            label={endLabel(key)}
            animationDuration={900}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

// ---------- RSVP per event ----------

const rsvpConfig = {
  attending: { label: 'Tham dự', color: 'var(--chart-1)' },
  maybe: { label: 'Chưa chắc', color: 'var(--chart-2)' },
  declined: { label: 'Không đến', color: 'var(--chart-3)' },
  pending: { label: 'Chưa trả lời', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const RSVP_KEYS = ['attending', 'maybe', 'declined', 'pending'] as const;

/** Part-to-whole per event: one horizontal stacked bar each. */
export function RsvpChart({ events }: { events: Dashboard['events'] }) {
  return (
    <ChartContainer
      config={rsvpConfig}
      className="aspect-auto w-full"
      style={{ height: 70 + events.length * 52 }}
    >
      <BarChart
        data={events}
        layout="vertical"
        margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
        barCategoryGap={14}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={128}
          tickLine={false}
          axisLine={false}
          tick={{ ...AXIS_TICK, fill: 'var(--foreground)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
          content={<ChartTooltipContent />}
        />
        <ChartLegend
          content={<ChartLegendContent />}
          verticalAlign="top"
          itemSorter={null}
        />
        {RSVP_KEYS.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="rsvp"
            fill={`var(--color-${key})`}
            barSize={24}
            {...GAP}
            radius={i === RSVP_KEYS.length - 1 ? [0, 4, 4, 0] : 0}
            animationDuration={900}
          >
            {key === 'pending' && (
              <LabelList
                position="right"
                className="fill-foreground"
                fontSize={12}
                formatter={() => ''}
                content={({ x, y, width, height, index }) => {
                  const e = events[Number(index)];
                  if (!e) return null;
                  return (
                    <text
                      x={Number(x) + Number(width) + 8}
                      y={Number(y) + Number(height) / 2}
                      dy={4}
                      fontSize={12}
                      fill="var(--foreground)"
                    >
                      {e.headcount} khách
                    </text>
                  );
                }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}

// ---------- single-series horizontal bars ----------

/** Magnitude per category, largest first, value at each bar's tip. */
type Row = Record<string, string | number>;

export function BarList({
  data,
  labelKey,
  valueKey,
  seriesLabel,
  format = (v) => String(v),
  detail,
}: {
  data: Row[];
  labelKey: string;
  valueKey: string;
  seriesLabel: string;
  format?: (value: number) => string;
  /** Extra line in the tooltip. */
  detail?: (row: Row) => string;
}) {
  const config = {
    [valueKey]: { label: seriesLabel, color: 'var(--chart-1)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: 16 + data.length * 36 }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 96, bottom: 0, left: 0 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={112}
          tickLine={false}
          axisLine={false}
          tick={{ ...AXIS_TICK, fill: 'var(--foreground)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value, _name, item) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {format(Number(value))}
                  </span>
                  {detail && (
                    <span className="text-muted-foreground">
                      {detail(item.payload as Row)}
                    </span>
                  )}
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey={valueKey}
          fill={`var(--color-${valueKey})`}
          barSize={20}
          radius={[0, 4, 4, 0]}
          animationDuration={900}
        >
          <LabelList
            dataKey={valueKey}
            position="right"
            offset={8}
            fontSize={12}
            className="fill-foreground"
            formatter={(v: unknown) => format(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ---------- part-to-whole donut ----------

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
}

/* only three validated categorical hues; the tail folds into a neutral slot */
const DONUT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
const DONUT_REST = 'var(--chart-4)';

/**
 * Share of a whole, largest first. Keeps at most `max - 1` named slices and
 * folds the rest into one neutral "other" slice, with a legend that carries
 * the value and percentage so color is never the only cue.
 */
export function Donut({
  slices,
  max = 4,
  otherLabel = 'Khác',
  centerLabel,
  format = (v) => String(v),
}: {
  slices: DonutSlice[];
  max?: number;
  otherLabel?: string;
  centerLabel: string;
  format?: (value: number) => string;
}) {
  const data = useMemo(() => {
    const sorted = slices
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    const head = sorted.length > max ? sorted.slice(0, max - 1) : sorted;
    const tail = sorted.slice(head.length);
    const rows = head.map((s, i) => ({
      ...s,
      fill: DONUT_COLORS[i] ?? DONUT_REST,
    }));
    if (tail.length)
      rows.push({
        key: 'other',
        label: `${otherLabel} (${tail.length})`,
        value: tail.reduce((n, s) => n + s.value, 0),
        fill: DONUT_REST,
      });
    return rows;
  }, [slices, max, otherLabel]);

  const total = data.reduce((n, s) => n + s.value, 0);
  const config = Object.fromEntries(
    data.map((s) => [s.key, { label: s.label, color: s.fill }]),
  ) satisfies ChartConfig;

  if (!total)
    return <p className="text-sm text-muted-foreground">Chưa có số liệu.</p>;

  return (
    <div className="grid gap-6 pt-2">
      <ChartContainer config={config} className="mx-auto aspect-square h-56">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="key"
                hideLabel
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: item.payload.fill }}
                    />
                    <span className="text-muted-foreground">
                      {item.payload.label}
                    </span>
                    <span className="ml-auto pl-3 font-medium tabular-nums">
                      {format(Number(value))} ·{' '}
                      {Math.round((Number(value) / total) * 100)}%
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={0}
            {...(data.length > 1 ? GAP : { stroke: 'none' })}
            animationDuration={900}
          >
            <Label
              content={({ viewBox }) =>
                viewBox && 'cx' in viewBox ? (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={Number(viewBox.cy) - 6}
                      className="fill-foreground text-xl font-semibold"
                    >
                      {format(total)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={Number(viewBox.cy) + 16}
                      className="fill-muted-foreground text-xs"
                    >
                      {centerLabel}
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid gap-2.5 text-sm">
        {data.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5">
            <span
              className="size-3 shrink-0 rounded-[3px]"
              style={{ background: s.fill }}
            />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="font-medium tabular-nums">{format(s.value)}</span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
