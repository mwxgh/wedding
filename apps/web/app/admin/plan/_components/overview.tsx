'use client';

import { useState } from 'react';

import { AlertTriangleIcon, PencilIcon } from 'lucide-react';

import type { PlanSummary } from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { CardContent } from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';

import {
  PLAN_CATEGORY_LABEL,
  daysUntil,
  formatDay,
  formatVndShort,
} from '../../../_lib/format';
import { Donut } from '../../_components/charts';
import { Count, Meter, Panel, PanelTitle } from '../../_components/stats';

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Due-date wording with overdue in the critical status (icon + label). */
export function DueLabel({
  iso,
  done,
}: {
  iso: string | null;
  done?: boolean;
}) {
  if (!iso) return <span className="text-muted-foreground">Chưa đặt hạn</span>;
  const d = daysUntil(iso);
  if (!done && d < 0)
    return (
      <span
        className={
          'inline-flex items-center gap-1 font-medium text-destructive'
        }
      >
        <AlertTriangleIcon className="size-3.5" />
        Quá hạn {-d} ngày
      </span>
    );
  return (
    <span className="text-muted-foreground">
      {formatDay(iso)}
      {!done && d === 0 && ' · hôm nay'}
      {!done && d > 0 && d <= 14 && ` · còn ${d} ngày`}
    </span>
  );
}

function Money({
  label,
  value,
  context,
  meter,
  action,
  index,
}: {
  label: string;
  value: number;
  context?: React.ReactNode;
  meter?: { value: number; max: number };
  action?: React.ReactNode;
  index: number;
}) {
  return (
    <Panel index={index}>
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {action}
        </div>
        <p className="text-3xl font-semibold tracking-tight">
          <Count value={value / 1e6} decimals={1} />
          <span className="ml-1 text-base font-medium text-muted-foreground">
            triệu ₫
          </span>
        </p>
        {meter && <Meter value={meter.value} max={meter.max} />}
        {context && (
          <p className="mt-auto text-xs text-muted-foreground">{context}</p>
        )}
      </CardContent>
    </Panel>
  );
}

export function PlanOverview({
  summary,
  onEditBudget,
}: {
  summary: PlanSummary;
  onEditBudget: () => void;
}) {
  const budget = Number(summary.budget ?? 0);
  const estimated = Number(summary.estimated);
  const paid = Number(summary.paid);
  const remaining = Math.max(0, estimated - paid);
  const over = budget > 0 && estimated > budget;
  const days = summary.weddingDate ? daysUntil(summary.weddingDate) : null;
  const t = summary.tasks;
  const [share, setShare] = useState<'estimated' | 'paid'>('estimated');

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div
        className={`grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-12
          xl:grid-cols-4`}
      >
        <Money
          index={0}
          label="Ngân sách"
          value={budget}
          action={
            <Button
              variant="ghost"
              size="icon-sm"
              title="Sửa ngân sách"
              onClick={onEditBudget}
            >
              <PencilIcon />
            </Button>
          }
          context={budget ? 'Mục tiêu tổng chi' : 'Chưa đặt ngân sách'}
        />
        <Money
          index={1}
          label="Dự kiến"
          value={estimated}
          meter={budget ? { value: estimated, max: budget } : undefined}
          context={
            over ? (
              <span
                className={`inline-flex items-center gap-1 font-medium
                  text-destructive`}
              >
                <AlertTriangleIcon className="size-3.5" />
                Vượt ngân sách {formatVndShort(estimated - budget)} ₫
              </span>
            ) : budget ? (
              `${pct(estimated, budget)}% ngân sách`
            ) : (
              'Tổng dự kiến các khoản chi'
            )
          }
        />
        <Money
          index={2}
          label="Đã chi"
          value={paid}
          meter={{ value: paid, max: Math.max(1, estimated) }}
          context={`${pct(paid, estimated)}% số dự kiến`}
        />
        <Money
          index={3}
          label="Còn phải chi"
          value={remaining}
          context={
            days !== null && days >= 0
              ? `Còn ${days} ngày đến đám cưới`
              : 'Theo các khoản dự kiến'
          }
        />
      </div>

      <Panel index={4} className="lg:col-span-5">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <PanelTitle
              title="Cơ cấu chi phí"
              description="Tỷ trọng theo hạng mục"
            />
            <div className="flex shrink-0 gap-1 rounded-lg bg-muted p-0.5">
              {(
                [
                  ['estimated', 'Dự kiến'],
                  ['paid', 'Đã chi'],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={share === key ? 'outline' : 'ghost'}
                  aria-pressed={share === key}
                  onClick={() => setShare(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Donut
            slices={summary.byCategory.map((c) => ({
              key: c.category,
              label: PLAN_CATEGORY_LABEL[c.category],
              value: Number(c[share]),
            }))}
            centerLabel={share === 'paid' ? 'đã chi' : 'dự kiến'}
            format={(v) => `${formatVndShort(v)} ₫`}
          />
        </CardContent>
      </Panel>

      <Panel index={5} className="lg:col-span-7">
        <CardContent>
          <PanelTitle
            title="Chi theo hạng mục"
            description="Phần tô đậm là đã chi, rãnh nhạt là số dự kiến"
          />
          {summary.byCategory.length ? (
            <ul className="grid gap-3.5">
              {summary.byCategory.map((c) => {
                const est = Number(c.estimated);
                const pd = Number(c.paid);
                return (
                  <li key={c.category} className="grid gap-1.5">
                    <div
                      className={`flex items-baseline justify-between gap-3
                        text-sm`}
                    >
                      <span>{PLAN_CATEGORY_LABEL[c.category]}</span>
                      <span className="text-muted-foreground tabular-nums">
                        <span className="font-medium text-foreground">
                          {formatVndShort(pd)}
                        </span>{' '}
                        / {formatVndShort(est)} ₫
                      </span>
                    </div>
                    <Meter value={pd} max={Math.max(1, est, pd)} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có khoản chi.</p>
          )}
        </CardContent>
      </Panel>

      <Panel index={6} className="lg:col-span-12">
        <CardContent>
          <PanelTitle
            title="Việc cần làm"
            description={`${t.done}/${t.total} việc đã xong`}
          />
          <Meter value={t.done} max={Math.max(1, t.total)} />
          <div className="mt-3 flex gap-4 text-sm">
            <span
              className={cn(
                'inline-flex items-center gap-1',
                t.overdue
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {t.overdue > 0 && <AlertTriangleIcon className="size-3.5" />}
              {t.overdue} quá hạn
            </span>
            <span className="text-muted-foreground">
              {t.dueSoon} việc trong 2 tuần tới
            </span>
          </div>
          <ul
            className={`mt-4 grid gap-x-8 gap-y-2.5 border-t pt-4
              sm:grid-cols-2`}
          >
            {summary.upcoming.map((task) => (
              <li key={task.id} className="grid text-sm">
                <span className="font-medium">{task.title}</span>
                <span className="text-xs">
                  <DueLabel iso={task.dueDate} />
                </span>
              </li>
            ))}
            {!summary.upcoming.length && (
              <li className="text-sm text-muted-foreground">
                Không còn việc nào. Tuyệt vời!
              </li>
            )}
          </ul>
        </CardContent>
      </Panel>
    </div>
  );
}
