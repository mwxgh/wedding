'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import {
  ArrowRightIcon,
  ImageIcon,
  MessageSquareHeartIcon,
} from 'lucide-react';

import type { Dashboard, Side } from '@repo/contracts';
import { buttonVariants } from '@repo/ui/components/button';
import { CardContent } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { cn } from '@repo/ui/lib/utils';

import {
  GIFT_METHOD_LABEL,
  RELATION_LABEL,
  SIDE_LABEL,
  formatDateTime,
  formatVnd,
} from '../_lib/format';
import { ActivityChart, BarList, RsvpChart } from './_components/charts';
import { Count, Meter, Panel, PanelTitle, StatTile } from './_components/stats';
import { useAdminData } from './_lib/auth';
import { ErrorAlert, PageHeader } from './_lib/ui';

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

const millions = (amount: string | number) => Number(amount) / 1_000_000;

// fixed hue per side, the same in every chart (color follows the entity)
const SIDE_COLOR: Record<Side, string> = {
  GROOM: 'bg-chart-1',
  BRIDE: 'bg-chart-2',
  BOTH: 'bg-chart-3',
};

/** Share of invited guests per side: one 100% bar with surface gaps. */
function SideSplit({ bySide }: { bySide: Dashboard['bySide'] }) {
  const total = bySide.reduce((n, s) => n + s.guests, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
        {bySide.map((s) => (
          <div
            key={s.side}
            title={`${SIDE_LABEL[s.side]}: ${s.guests} khách`}
            className={cn(
              'h-full first:rounded-l-md last:rounded-r-md',
              SIDE_COLOR[s.side],
            )}
            style={{ width: `${(s.guests / Math.max(1, total)) * 100}%` }}
          />
        ))}
      </div>
      <ul className="grid gap-2 text-sm">
        {bySide.map((s) => (
          <li key={s.side} className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-sm', SIDE_COLOR[s.side])} />
            <span>{SIDE_LABEL[s.side]}</span>
            <span className="ml-auto font-medium tabular-nums">
              {s.guests} khách
            </span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">
              {pct(s.guests, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof ImageIcon;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border p-3
        transition-colors hover:bg-muted`}
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
          count
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
      <ArrowRightIcon className="size-4 text-muted-foreground" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Skeleton className="h-48 rounded-xl lg:col-span-4" />
      <Skeleton className="h-48 rounded-xl lg:col-span-8" />
      <Skeleton className="h-80 rounded-xl lg:col-span-8" />
      <Skeleton className="h-80 rounded-xl lg:col-span-4" />
    </div>
  );
}

export default function DashboardPage() {
  const { data, error } = useAdminData<Dashboard>('/admin/dashboard');

  const derived = useMemo(() => {
    if (!data) return null;
    // the main event is the one most guests are invited to
    const main = [...data.events].sort((a, b) => b.invited - a.invited)[0];
    let opened = 0;
    let responded = 0;
    const openedTrend: number[] = [];
    const respondedTrend: number[] = [];
    for (const d of data.timeline.slice(-14)) {
      opened += d.opened;
      responded += d.responded;
      openedTrend.push(opened);
      respondedTrend.push(responded);
    }
    return { main, openedTrend, respondedTrend };
  }, [data]);

  return (
    <>
      <PageHeader title="Tổng quan" />
      <ErrorAlert error={error} />
      {!data && !error && <DashboardSkeleton />}
      {data && derived && (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* hero: the one number this dashboard leads with */}
          <Panel index={0} className="lg:col-span-4">
            <CardContent className="flex h-full flex-col gap-3">
              <span className="text-sm text-muted-foreground">
                Khách đã xác nhận
                {derived.main && ` · ${derived.main.name}`}
              </span>
              <p className="text-6xl font-semibold tracking-tight">
                <Count value={derived.main?.headcount ?? 0} />
              </p>
              <Meter
                value={derived.main?.headcount ?? 0}
                max={data.invitations.guests}
              />
              <p className="text-xs text-muted-foreground">
                trên {data.invitations.guests} khách được mời (
                {pct(derived.main?.headcount ?? 0, data.invitations.guests)}%)
              </p>
              <ul className="mt-auto grid gap-1.5 border-t pt-3 text-sm">
                {data.events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{e.name}</span>
                    <span className="font-medium tabular-nums">
                      {e.headcount} khách
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Panel>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-8">
            <StatTile
              index={1}
              label="Thiệp đã gửi"
              value={data.invitations.total}
              context={`${data.invitations.guests} khách`}
            />
            <StatTile
              index={2}
              label="Đã mở thiệp"
              value={data.invitations.opened}
              meter={{
                value: data.invitations.opened,
                max: data.invitations.total,
              }}
              context={`${pct(data.invitations.opened, data.invitations.total)}% số thiệp`}
              trend={derived.openedTrend}
            />
            <StatTile
              index={3}
              label="Đã phản hồi"
              value={data.invitations.responded}
              meter={{
                value: data.invitations.responded,
                max: data.invitations.total,
              }}
              context={`${pct(data.invitations.responded, data.invitations.opened)}% người đã mở`}
              trend={derived.respondedTrend}
            />
            <StatTile
              index={4}
              label="Mừng cưới"
              value={millions(data.gifts.totalAmount)}
              decimals={1}
              suffix="triệu ₫"
              context={`${data.gifts.count} lượt`}
            />
          </div>

          <Panel index={5} className="lg:col-span-8">
            <CardContent>
              <PanelTitle
                title="Diễn biến"
                description="Số thiệp đã mở và đã phản hồi, cộng dồn theo ngày"
              />
              <ActivityChart timeline={data.timeline} />
            </CardContent>
          </Panel>

          <div className="grid min-w-0 gap-4 lg:col-span-4">
            <Panel index={6}>
              <CardContent>
                <PanelTitle
                  title="Khách theo bên"
                  description="Theo số khách được mời"
                />
                <SideSplit bySide={data.bySide} />
              </CardContent>
            </Panel>
            <Panel index={7}>
              <CardContent className="flex flex-col gap-2">
                <PanelTitle title="Chờ duyệt" />
                <QueueLink
                  href="/admin/guestbook"
                  icon={MessageSquareHeartIcon}
                  label="Lời chúc"
                  count={data.guestbookPending}
                />
                <QueueLink
                  href="/admin/photos"
                  icon={ImageIcon}
                  label="Ảnh của khách"
                  count={data.photosPending}
                />
              </CardContent>
            </Panel>
          </div>

          <Panel index={8} className="lg:col-span-7">
            <CardContent>
              <PanelTitle
                title="Phản hồi theo sự kiện"
                description="Số thiệp theo trạng thái; bên phải là số khách sẽ tới"
              />
              <RsvpChart events={data.events} />
            </CardContent>
          </Panel>

          <Panel index={9} className="lg:col-span-5">
            <CardContent>
              <PanelTitle
                title="Xếp bàn"
                description="Khách đã xác nhận được xếp chỗ"
                action={
                  <Link
                    href="/admin/events"
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Quản lý
                  </Link>
                }
              />
              <ul className="grid gap-5">
                {data.events.map((e) => (
                  <li key={e.id} className="grid gap-2">
                    <div
                      className={`flex items-baseline justify-between gap-2
                      text-sm`}
                    >
                      <span className="font-medium">{e.name}</span>
                      <span className="tabular-nums">
                        {e.seated}/{e.headcount} khách
                      </span>
                    </div>
                    <Meter value={e.seated} max={Math.max(1, e.headcount)} />
                    <p className="text-xs text-muted-foreground">
                      {e.capacity
                        ? `${e.capacity} chỗ ở các bàn · còn trống ${Math.max(0, e.capacity - e.seated)}`
                        : 'Chưa tạo bàn'}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Panel>

          <Panel index={10} className="lg:col-span-6">
            <CardContent>
              <PanelTitle
                title="Khách theo quan hệ"
                description="Số khách được mời"
              />
              <BarList
                data={data.byRelation.map((r) => ({
                  ...r,
                  name: RELATION_LABEL[r.relation],
                }))}
                labelKey="name"
                valueKey="guests"
                seriesLabel="Khách"
                format={(v) => `${v} khách`}
                detail={(r) => `${r.invitations} thiệp`}
              />
            </CardContent>
          </Panel>

          <Panel index={11} className="lg:col-span-6">
            <CardContent>
              <PanelTitle title="Mừng cưới theo hình thức" />
              {data.gifts.byMethod.length ? (
                <BarList
                  data={data.gifts.byMethod.map((g) => ({
                    name: GIFT_METHOD_LABEL[g.method],
                    amount: millions(g.amount),
                    count: g.count,
                  }))}
                  labelKey="name"
                  valueKey="amount"
                  seriesLabel="Số tiền"
                  format={(v) => `${v.toLocaleString('vi-VN')} tr ₫`}
                  detail={(g) => `${g.count} lượt`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có ghi nhận.
                </p>
              )}
            </CardContent>
          </Panel>

          {/* the same numbers as a table: nothing above is hover- or color-only */}
          <Panel index={12} className="lg:col-span-12">
            <CardContent>
              <PanelTitle title="Bảng số liệu RSVP" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sự kiện</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Đã mời</TableHead>
                    <TableHead className="text-right">Tham dự</TableHead>
                    <TableHead className="text-right">Chưa chắc</TableHead>
                    <TableHead className="text-right">Không đến</TableHead>
                    <TableHead className="text-right">Chưa trả lời</TableHead>
                    <TableHead className="text-right">Số khách</TableHead>
                    <TableHead className="text-right">Đã xếp bàn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {data.events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{formatDateTime(e.startAt)}</TableCell>
                      <TableCell className="text-right">{e.invited}</TableCell>
                      <TableCell className="text-right">
                        {e.attending}
                      </TableCell>
                      <TableCell className="text-right">{e.maybe}</TableCell>
                      <TableCell className="text-right">{e.declined}</TableCell>
                      <TableCell className="text-right">{e.pending}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {e.headcount}
                      </TableCell>
                      <TableCell className="text-right">{e.seated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Tổng mừng cưới: {formatVnd(data.gifts.totalAmount)} ·{' '}
                {data.gifts.count} lượt
              </p>
            </CardContent>
          </Panel>
        </div>
      )}
    </>
  );
}
