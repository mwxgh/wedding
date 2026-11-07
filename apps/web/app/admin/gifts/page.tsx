'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  GiftIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  ZapIcon,
} from 'lucide-react';

import type {
  AdminEvent,
  AdminGift,
  AdminInvitation,
  GiftInput,
  GiftMethod,
  GiftSource,
  PayosChannel,
  PayosSyncResult,
  Side,
} from '@repo/types';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { useConfirm } from '@repo/ui/components/confirm-dialog';
import { Empty } from '@repo/ui/components/empty';
import { ExportButton } from '@repo/ui/components/export-button';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';

import { FieldRow, FormField } from '../../_components/common';
import {
  GIFT_METHOD_LABEL,
  GIFT_SOURCE_LABEL,
  SIDE_LABEL,
  formatDateTime,
  formatVnd,
} from '../../_lib/format';
import { Count, Panel } from '../_components/stats';
import { useQueryParam, useRunner, useSetQuery } from '../_lib/actions';
import { useAdminData, useAuth } from '../_lib/auth';
import { giftSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, ListSkeleton, PageHeader } from '../_lib/ui';

interface GiftForm {
  id?: string;
  source: GiftSource;
  giverName: string;
  method: GiftMethod;
  amount: string;
  description: string;
  side: Side | '';
  invitationId: string;
  eventId: string;
}

const emptyGift: GiftForm = {
  source: 'MANUAL',
  giverName: '',
  method: 'CASH',
  amount: '',
  description: '',
  side: '',
  invitationId: '',
  eventId: '',
};

/** New online gifts show up without a manual refresh. */
const REFRESH_MS = 20_000;

const sumOf = (gifts: AdminGift[]) =>
  gifts.reduce((n, g) => n + Number(g.amount ?? 0), 0);

export default function GiftsPage() {
  const { api } = useAuth();
  const { data, error, reload } = useAdminData<AdminGift[]>('/admin/gifts');
  const { data: invitations } =
    useAdminData<AdminInvitation[]>('/admin/invitations');
  const { data: events } = useAdminData<AdminEvent[]>('/admin/events');
  const { data: channels } = useAdminData<PayosChannel[]>(
    '/admin/payos/channels',
  );
  const [form, setForm] = useState<GiftForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { run, isBusy } = useRunner();
  const [sourceParam, setSource] = useQueryParam('source');
  const [sideParam, setSide] = useQueryParam('side');
  const source = (sourceParam ?? '') as '' | GiftSource;
  const side = (sideParam ?? '') as '' | Side;
  const filtered = !!(source || side);
  const setQuery = useSetQuery();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  const gifts = useMemo(() => data ?? [], [data]);
  const list = useMemo(
    () =>
      gifts.filter(
        (g) => (!source || g.source === source) && (!side || g.side === side),
      ),
    [gifts, source, side],
  );
  const payosOn = channels?.some((c) => c.configured) ?? false;

  const set = (patch: Partial<GiftForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));
  const locked = form?.source === 'PAYOS';

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, source: _source, ...rest } = form;
    // bank-confirmed fields of a payOS gift are not sent at all
    const body: Partial<GiftInput> = {
      giverName: rest.giverName,
      description: rest.description || undefined,
      invitationId: rest.invitationId || undefined,
      eventId: rest.eventId || undefined,
      ...(locked
        ? {}
        : {
            method: rest.method,
            amount: rest.amount ? Number(rest.amount) : undefined,
            side: rest.side || null,
          }),
    };
    try {
      await api(id ? `/admin/gifts/${id}` : '/admin/gifts', {
        method: id ? 'PATCH' : 'POST',
        body,
      });
      setForm(null);
      toast.success('Đã lưu mừng cưới');
      await reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function remove(g: AdminGift) {
    if (
      !(await confirm({
        title: `Xoá bản ghi mừng cưới của "${g.giverName}"?`,
        description:
          g.source === 'PAYOS'
            ? 'Khoản này do payOS xác nhận. Xoá bản ghi không hoàn tiền cho khách.'
            : 'Không thể hoàn tác.',
      }))
    )
      return;
    await run(
      g.id,
      async () => {
        await api(`/admin/gifts/${g.id}`, { method: 'DELETE' });
        await reload();
      },
      'Đã xoá bản ghi mừng cưới',
    );
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await api<PayosSyncResult>('/admin/payos/sync', {
        method: 'POST',
      });
      toast.success(
        res.paid
          ? `Đã đồng bộ thêm ${res.paid} khoản từ payOS`
          : `Đã kiểm tra ${res.checked} mã đang chờ, không có khoản mới`,
      );
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const tiles: {
    label: string;
    items: AdminGift[];
    hint?: React.ReactNode;
  }[] = [
    { label: 'Tổng nhận', items: gifts },
    {
      label: 'Qua payOS',
      items: gifts.filter((g) => g.source === 'PAYOS'),
      hint: (
        <span className="inline-flex items-center gap-1">
          <ZapIcon aria-hidden className="size-3" /> tự đồng bộ
        </span>
      ),
    },
    { label: 'Nhà trai', items: gifts.filter((g) => g.side === 'GROOM') },
    { label: 'Nhà gái', items: gifts.filter((g) => g.side === 'BRIDE') },
  ];

  return (
    <>
      <PageHeader
        title="Mừng cưới"
        actions={
          <>
            <ExportButton
              fileName="Mung cuoi"
              disabled={!data}
              sheets={() => giftSheets(list)}
            />
            {payosOn && (
              <Button
                variant="outline"
                size="lg"
                onClick={sync}
                disabled={syncing}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  aria-hidden
                  className={
                    syncing ? 'animate-spin motion-reduce:animate-none' : ''
                  }
                />
                Đồng bộ payOS
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => {
                setFormError(null);
                setForm(emptyGift);
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Ghi nhận
            </Button>
          </>
        }
      />
      <ErrorAlert error={error} onRetry={reload} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t, i) => (
          <Panel key={t.label} index={i}>
            <CardContent className="flex flex-col gap-1.5">
              <span
                className={`text-xs font-medium tracking-wide
                text-muted-foreground uppercase`}
              >
                {t.label}
              </span>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                <Count value={sumOf(t.items) / 1e6} decimals={1} />
                <span
                  className={'ml-1 text-base font-medium text-muted-foreground'}
                >
                  triệu ₫
                </span>
              </p>
              <p
                className={`flex gap-2 text-xs text-muted-foreground
                tabular-nums`}
              >
                {t.items.length} lượt {t.hint && <>· {t.hint}</>}
              </p>
            </CardContent>
          </Panel>
        ))}
      </div>

      <div
        className={`mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-3
          shadow-soft sm:flex-row sm:items-center`}
      >
        <SlidersHorizontalIcon
          aria-hidden
          className="hidden size-4 text-muted-foreground sm:block"
        />
        <NativeSelect
          className="w-full sm:w-auto"
          aria-label="Nguồn"
          value={source}
          onChange={(e) => setSource(e.target.value || null)}
        >
          <NativeSelectOption value="">Mọi nguồn</NativeSelectOption>
          <NativeSelectOption value="PAYOS">payOS</NativeSelectOption>
          <NativeSelectOption value="MANUAL">Ghi tay</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          className="w-full sm:w-auto"
          aria-label="Bên nhận"
          value={side}
          onChange={(e) => setSide(e.target.value || null)}
        >
          <NativeSelectOption value="">Cả hai bên</NativeSelectOption>
          <NativeSelectOption value="GROOM">Nhà trai</NativeSelectOption>
          <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
        </NativeSelect>
        <p className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
          {list.length} lượt ·{' '}
          <strong className="font-semibold text-foreground">
            {formatVnd(sumOf(list))}
          </strong>
        </p>
      </div>

      {!data && !error && <ListSkeleton />}
      <Card className={data ? 'py-0' : 'hidden'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người mừng</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Bên nhận</TableHead>
              <TableHead>Số tiền / mô tả</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="max-w-72 whitespace-normal">
                  <p className="font-medium text-foreground">{g.giverName}</p>
                  {g.invitation && (
                    <p className="text-xs text-muted-foreground">
                      Thiệp: {g.invitation.name}
                    </p>
                  )}
                  {g.message && (
                    <p
                      className={`mt-1.5 border-l-2 border-gold/60 pl-2 text-xs
                      text-muted-foreground italic`}
                    >
                      “{g.message}”
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {g.source === 'PAYOS' ? (
                    <Badge variant="secondary" className="gap-1">
                      <ZapIcon aria-hidden />
                      payOS
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {GIFT_METHOD_LABEL[g.method]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {g.side ? (
                    SIDE_LABEL[g.side]
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  {g.amount && (
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatVnd(g.amount)}
                    </p>
                  )}
                  {g.description && (
                    <p className="text-xs text-muted-foreground">
                      {g.description}
                    </p>
                  )}
                  {g.payment?.reference && (
                    <p className="text-xs text-muted-foreground">
                      Mã GD: {g.payment.reference}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatDateTime(g.receivedAt)}
                  {g.event && (
                    <p className="text-muted-foreground">{g.event.name}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="max-sm:size-11"
                      title="Sửa"
                      aria-label={`Sửa khoản mừng của ${g.giverName}`}
                      onClick={() => {
                        setFormError(null);
                        setForm({
                          id: g.id,
                          source: g.source,
                          giverName: g.giverName,
                          method: g.method,
                          amount: g.amount ?? '',
                          description: g.description ?? '',
                          side: g.side ?? '',
                          invitationId: g.invitation?.id ?? '',
                          eventId: g.event?.id ?? '',
                        });
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="max-sm:size-11"
                      title="Xoá"
                      aria-label={`Xoá khoản mừng của ${g.giverName}`}
                      disabled={isBusy(g.id)}
                      onClick={() => remove(g)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data && !list.length && (
              <TableRow>
                <TableCell colSpan={6} className="whitespace-normal">
                  {filtered && gifts.length ? (
                    <Empty
                      bare
                      icon={<GiftIcon />}
                      title="Không có khoản mừng nào khớp bộ lọc"
                      action={
                        <Button
                          variant="outline"
                          onClick={() => setQuery({ source: null, side: null })}
                        >
                          Xoá bộ lọc
                        </Button>
                      }
                    />
                  ) : (
                    <Empty
                      bare
                      icon={<GiftIcon />}
                      title="Chưa có bản ghi nào"
                      description="Bấm “Ghi nhận” để thêm khoản mừng đầu tiên."
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {channels && !payosOn && (
        <div
          className={`mt-4 flex items-start gap-3 rounded-2xl border
          border-dashed bg-accent/40 p-4 text-sm text-muted-foreground`}
        >
          <ZapIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-accent-foreground"
          />
          <p>
            Muốn khách mừng online và tự đồng bộ số tiền? Cấu hình payOS trong{' '}
            <Link
              href="/admin/settings"
              className={`font-medium text-rose-deep underline
              underline-offset-4 hover:text-primary`}
            >
              Cài đặt
            </Link>
            .
          </p>
        </div>
      )}

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa mừng cưới' : 'Ghi nhận mừng cưới'}
        description="Tiền mặt, chuyển khoản hoặc quà hiện vật."
        error={formError}
        value={form}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            {locked && (
              <p
                className={`flex items-start gap-2.5 rounded-xl border
                bg-muted/60 p-3 text-sm text-muted-foreground`}
              >
                <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                Khoản này do payOS xác nhận nên số tiền, hình thức và bên nhận
                được giữ nguyên.
              </p>
            )}
            <FormField label="Thiệp mời (tuỳ chọn)">
              <NativeSelect
                className="w-full"
                value={form.invitationId}
                onChange={(e) => {
                  const inv = invitations?.find((i) => i.id === e.target.value);
                  set({
                    invitationId: e.target.value,
                    giverName: form.giverName || inv?.name || '',
                    side:
                      form.side ||
                      (inv?.side === 'BOTH' ? '' : inv?.side) ||
                      '',
                  });
                }}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {invitations?.map((i) => (
                  <NativeSelectOption key={i.id} value={i.id}>
                    {i.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Người mừng">
              <Input
                value={form.giverName}
                onChange={(e) => set({ giverName: e.target.value })}
                required
              />
            </FormField>
            <FieldRow>
              <FormField label="Hình thức">
                <NativeSelect
                  className="w-full"
                  value={form.method}
                  disabled={locked}
                  onChange={(e) =>
                    set({ method: e.target.value as GiftMethod })
                  }
                >
                  {Object.entries(GIFT_METHOD_LABEL).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Bên nhận">
                <NativeSelect
                  className="w-full"
                  value={form.side}
                  disabled={locked}
                  onChange={(e) => set({ side: e.target.value as Side | '' })}
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  <NativeSelectOption value="GROOM">
                    Nhà trai
                  </NativeSelectOption>
                  <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
                </NativeSelect>
              </FormField>
            </FieldRow>
            <FormField label="Số tiền (VND)">
              <Input
                type="number"
                min={0}
                step={1000}
                value={form.amount}
                disabled={locked}
                onChange={(e) => set({ amount: e.target.value })}
              />
            </FormField>
            <FormField label="Mô tả (vd: 1 chỉ vàng)">
              <Input
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </FormField>
            <FormField label="Sự kiện">
              <NativeSelect
                className="w-full"
                value={form.eventId}
                onChange={(e) => set({ eventId: e.target.value })}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {events?.map((ev) => (
                  <NativeSelectOption key={ev.id} value={ev.id}>
                    {ev.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  );
}
