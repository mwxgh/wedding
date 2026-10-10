'use client';

import { useState } from 'react';

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type { AdminEvent, EventInput, Side } from '@repo/contracts';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';

import { FieldRow, FormField } from '../../_components/common';
import {
  SIDE_LABEL,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
} from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { ErrorAlert, FormDialog, PageHeader } from '../_lib/ui';

interface EventForm {
  id?: string;
  name: string;
  side: Side;
  startAt: string;
  endAt: string;
  venueName: string;
  address: string;
  mapUrl: string;
  sortOrder: number;
}

const emptyEvent: EventForm = {
  name: '',
  side: 'BOTH',
  startAt: '',
  endAt: '',
  venueName: '',
  address: '',
  mapUrl: '',
  sortOrder: 0,
};

export default function EventsPage() {
  const { api } = useAuth();
  const { data, error, reload } = useAdminData<AdminEvent[]>('/admin/events');
  const [form, setForm] = useState<EventForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tableName, setTableName] = useState<Record<string, string>>({});

  const set = (patch: Partial<EventForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const body: EventInput = {
      ...rest,
      startAt: fromLocalInput(rest.startAt) ?? '',
      endAt: fromLocalInput(rest.endAt),
      mapUrl: rest.mapUrl || undefined,
    };
    try {
      await api(id ? `/admin/events/${id}` : '/admin/events', {
        method: id ? 'PATCH' : 'POST',
        body,
      });
      setForm(null);
      toast.success('Đã lưu sự kiện');
      await reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function removeEvent(ev: AdminEvent) {
    if (
      !confirm(
        `Xoá sự kiện "${ev.name}"? RSVP và bàn tiệc của sự kiện này cũng bị xoá.`,
      )
    )
      return;
    await api(`/admin/events/${ev.id}`, { method: 'DELETE' });
    toast.success('Đã xoá sự kiện');
    await reload();
  }

  async function addTable(eventId: string) {
    const name = tableName[eventId]?.trim();
    if (!name) return;
    try {
      await api(`/admin/events/${eventId}/tables`, { body: { name } });
      setTableName((t) => ({ ...t, [eventId]: '' }));
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function removeTable(id: string) {
    if (!confirm('Xoá bàn này?')) return;
    await api(`/admin/tables/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Sự kiện & bàn tiệc"
        actions={
          <Button
            size="lg"
            onClick={() => {
              setFormError(null);
              setForm(emptyEvent);
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Thêm sự kiện
          </Button>
        }
      />
      <ErrorAlert error={error} />

      <div className="grid gap-4">
        {data?.map((ev) => (
          <Card key={ev.id}>
            <CardHeader>
              <CardTitle className="font-serif text-xl">{ev.name}</CardTitle>
              <CardDescription>
                {SIDE_LABEL[ev.side]} · {formatDateTime(ev.startAt)} ·{' '}
                {ev.venueName} — {ev.address}
              </CardDescription>
              <CardAction className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Sửa"
                  onClick={() => {
                    setFormError(null);
                    setForm({
                      id: ev.id,
                      name: ev.name,
                      side: ev.side,
                      startAt: toLocalInput(ev.startAt),
                      endAt: toLocalInput(ev.endAt),
                      venueName: ev.venueName,
                      address: ev.address,
                      mapUrl: ev.mapUrl ?? '',
                      sortOrder: ev.sortOrder,
                    });
                  }}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  title="Xoá"
                  onClick={() => removeEvent(ev)}
                >
                  <Trash2Icon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <h4 className="mb-2 font-semibold">
                Bàn tiệc ({ev.tables.length})
              </h4>
              <div
                className={`grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]
                gap-2.5`}
              >
                {ev.tables.map((t) => {
                  const seated = t.seats.reduce(
                    (n, s) => n + s.attendingCount,
                    0,
                  );
                  return (
                    <Card key={t.id} size="sm">
                      <CardHeader>
                        <CardTitle>{t.name}</CardTitle>
                        <CardAction>
                          <Badge
                            variant={
                              seated > t.capacity ? 'destructive' : 'secondary'
                            }
                          >
                            {seated}/{t.capacity}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        <ul className="list-disc pl-4 text-sm">
                          {t.seats.map((s) => (
                            <li key={s.invitationId}>
                              {s.invitation.name} ({s.attendingCount})
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="self-start"
                          onClick={() => removeTable(t.id)}
                        >
                          Xoá bàn
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-56"
                  placeholder="Tên bàn (vd: Bàn 4)"
                  value={tableName[ev.id] ?? ''}
                  onChange={(e) =>
                    setTableName((t) => ({ ...t, [ev.id]: e.target.value }))
                  }
                />
                <Button variant="outline" onClick={() => addTable(ev.id)}>
                  <PlusIcon data-icon="inline-start" />
                  Thêm bàn
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Xếp khách vào bàn ở trang Thiệp mời → Sửa.
              </p>
            </CardContent>
          </Card>
        ))}
        {data && !data.length && (
          <p className="text-muted-foreground">Chưa có sự kiện nào.</p>
        )}
      </div>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa sự kiện' : 'Thêm sự kiện'}
        error={formError}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            <FormField label="Tên sự kiện (vd: Lễ Vu Quy, Tiệc Thành Hôn)">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
            </FormField>
            <FieldRow>
              <FormField label="Bên tổ chức">
                <NativeSelect
                  className="w-full"
                  value={form.side}
                  onChange={(e) => set({ side: e.target.value as Side })}
                >
                  {Object.entries(SIDE_LABEL).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Thứ tự hiển thị">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => set({ sortOrder: Number(e.target.value) })}
                />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Bắt đầu">
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => set({ startAt: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Kết thúc (tuỳ chọn)">
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => set({ endAt: e.target.value })}
                />
              </FormField>
            </FieldRow>
            <FormField label="Địa điểm">
              <Input
                value={form.venueName}
                onChange={(e) => set({ venueName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Địa chỉ">
              <Input
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Link Google Maps (tuỳ chọn)">
              <Input
                type="url"
                value={form.mapUrl}
                onChange={(e) => set({ mapUrl: e.target.value })}
              />
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  );
}
