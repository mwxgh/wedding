'use client';

import { useState } from 'react';

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type {
  AdminEvent,
  AdminGift,
  AdminInvitation,
  GiftInput,
  GiftMethod,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { Card } from '@repo/ui/components/card';
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
  formatDateTime,
  formatVnd,
} from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { ErrorAlert, FormDialog, PageHeader } from '../_lib/ui';

interface GiftForm {
  id?: string;
  giverName: string;
  method: GiftMethod;
  amount: string;
  description: string;
  invitationId: string;
  eventId: string;
}

const emptyGift: GiftForm = {
  giverName: '',
  method: 'CASH',
  amount: '',
  description: '',
  invitationId: '',
  eventId: '',
};

export default function GiftsPage() {
  const { api } = useAuth();
  const { data, error, reload } = useAdminData<AdminGift[]>('/admin/gifts');
  const { data: invitations } =
    useAdminData<AdminInvitation[]>('/admin/invitations');
  const { data: events } = useAdminData<AdminEvent[]>('/admin/events');
  const [form, setForm] = useState<GiftForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const total = (data ?? []).reduce((n, g) => n + Number(g.amount ?? 0), 0);
  const set = (patch: Partial<GiftForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const body: GiftInput = {
      giverName: rest.giverName,
      method: rest.method,
      amount: rest.amount ? Number(rest.amount) : undefined,
      description: rest.description || undefined,
      invitationId: rest.invitationId || undefined,
      eventId: rest.eventId || undefined,
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

  return (
    <>
      <PageHeader
        title="Mừng cưới"
        actions={
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
        }
      />
      <ErrorAlert error={error} />
      <p className="mb-4">
        Tổng tiền: <strong>{formatVnd(total)}</strong> · {data?.length ?? 0}{' '}
        lượt
      </p>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người mừng</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Số tiền / mô tả</TableHead>
              <TableHead>Sự kiện</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <p>{g.giverName}</p>
                  {g.invitation && (
                    <p className="text-xs text-muted-foreground">
                      Thiệp: {g.invitation.name}
                    </p>
                  )}
                </TableCell>
                <TableCell>{GIFT_METHOD_LABEL[g.method]}</TableCell>
                <TableCell>
                  {g.amount && (
                    <p className="font-semibold">{formatVnd(g.amount)}</p>
                  )}
                  {g.description && (
                    <p className="text-muted-foreground">{g.description}</p>
                  )}
                </TableCell>
                <TableCell>{g.event?.name ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  {formatDateTime(g.receivedAt)}
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
                          giverName: g.giverName,
                          method: g.method,
                          amount: g.amount ?? '',
                          description: g.description ?? '',
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
            {data && !data.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Chưa có bản ghi nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa mừng cưới' : 'Ghi nhận mừng cưới'}
        error={formError}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            <FormField label="Thiệp mời (tuỳ chọn)">
              <NativeSelect
                className="w-full"
                value={form.invitationId}
                onChange={(e) => {
                  const inv = invitations?.find((i) => i.id === e.target.value);
                  set({
                    invitationId: e.target.value,
                    giverName: form.giverName || inv?.name || '',
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
              <FormField label="Số tiền (VND)">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                />
              </FormField>
            </FieldRow>
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
