'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
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
} from '@repo/contracts';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
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
import { useAdminData, useAuth } from '../_lib/auth';
import { giftSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, PageHeader } from '../_lib/ui';

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
  const [source, setSource] = useState<'' | GiftSource>('');
  const [side, setSide] = useState<'' | Side>('');
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
    if (!confirm(`Xoá bản ghi mừng cưới của "${g.giverName}"?`)) return;
    await api(`/admin/gifts/${g.id}`, { method: 'DELETE' });
    await reload();
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
          <ZapIcon className="size-3" /> tự đồng bộ
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
                  className={syncing ? 'animate-spin' : undefined}
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
      <ErrorAlert error={error} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t, i) => (
          <Panel key={t.label} index={i}>
            <CardContent className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <p className="text-3xl font-semibold tracking-tight">
                <Count value={sumOf(t.items) / 1e6} decimals={1} />
                <span
                  className={'ml-1 text-base font-medium text-muted-foreground'}
                >
                  triệu ₫
                </span>
              </p>
              <p className="flex gap-2 text-xs text-muted-foreground">
                {t.items.length} lượt {t.hint && <>· {t.hint}</>}
              </p>
            </CardContent>
          </Panel>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="Nguồn"
          value={source}
          onChange={(e) => setSource(e.target.value as GiftSource | '')}
        >
          <NativeSelectOption value="">Mọi nguồn</NativeSelectOption>
          <NativeSelectOption value="PAYOS">payOS</NativeSelectOption>
          <NativeSelectOption value="MANUAL">Ghi tay</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          aria-label="Bên nhận"
          value={side}
          onChange={(e) => setSide(e.target.value as Side | '')}
        >
          <NativeSelectOption value="">Cả hai bên</NativeSelectOption>
          <NativeSelectOption value="GROOM">Nhà trai</NativeSelectOption>
          <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
        </NativeSelect>
        <span className="text-sm text-muted-foreground">
          {list.length} lượt · <strong>{formatVnd(sumOf(list))}</strong>
        </span>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người mừng</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Bên nhận</TableHead>
              <TableHead>Số tiền / mô tả</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="max-w-72 whitespace-normal">
                  <p className="font-medium">{g.giverName}</p>
                  {g.invitation && (
                    <p className="text-xs text-muted-foreground">
                      Thiệp: {g.invitation.name}
                    </p>
                  )}
                  {g.message && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      “{g.message}”
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {g.source === 'PAYOS' ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-primary/10 text-rose-deep"
                    >
                      <ZapIcon className="size-3" />
                      payOS
                    </Badge>
                  ) : (
                    <span className="text-sm">
                      {GIFT_METHOD_LABEL[g.method]}
                    </span>
                  )}
                </TableCell>
                <TableCell>{g.side ? SIDE_LABEL[g.side] : '—'}</TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  {g.amount && (
                    <p className="font-semibold tabular-nums">
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
                <TableCell className="text-xs">
                  {formatDateTime(g.receivedAt)}
                  {g.event && (
                    <p className="text-muted-foreground">{g.event.name}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Sửa"
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
                      size="icon-sm"
                      title="Xoá"
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
                <TableCell colSpan={6} className="text-muted-foreground">
                  Chưa có bản ghi nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {channels && !payosOn && (
        <p className="mt-4 text-sm text-muted-foreground">
          Muốn khách mừng online và tự đồng bộ số tiền? Cấu hình payOS trong{' '}
          <Link href="/admin/settings" className="text-rose-deep underline">
            Cài đặt
          </Link>
          .
        </p>
      )}

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa mừng cưới' : 'Ghi nhận mừng cưới'}
        error={formError}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            {locked && (
              <p
                className={`rounded-lg bg-muted p-3 text-sm
                text-muted-foreground`}
              >
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
