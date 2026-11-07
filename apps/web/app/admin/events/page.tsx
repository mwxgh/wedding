'use client';

import { useState } from 'react';

import {
  CalendarClockIcon,
  CalendarHeartIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UsersIcon,
  UtensilsIcon,
} from 'lucide-react';

import type {
  AdminEvent,
  EventInput,
  EventTimingInput,
  Side,
  WeddingInfoJson,
} from '@repo/types';
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
import { useConfirm } from '@repo/ui/components/confirm-dialog';
import { Empty } from '@repo/ui/components/empty';
import { ExportButton } from '@repo/ui/components/export-button';
import { Input } from '@repo/ui/components/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@repo/ui/components/native-select';
import { toast } from '@repo/ui/components/sonner';
import { vnDay } from '@repo/utils';

import { FieldRow, FormField } from '../../_components/common';
import { SIDE_LABEL, formatDateTime } from '../../_lib/format';
import {
  EventTimingFields,
  emptyTiming,
  offsetLabel,
} from '../_components/event-timing';
import { useRunner } from '../_lib/actions';
import { useAdminData, useAuth } from '../_lib/auth';
import { eventSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, ListSkeleton, PageHeader } from '../_lib/ui';

interface EventForm {
  id?: string;
  name: string;
  side: Side;
  timing: EventTimingInput;
  venueName: string;
  address: string;
  mapUrl: string;
  sortOrder: number;
}

const emptyEvent: EventForm = {
  name: '',
  side: 'BOTH',
  timing: emptyTiming,
  venueName: '',
  address: '',
  mapUrl: '',
  sortOrder: 0,
};

export default function EventsPage() {
  const { api } = useAuth();
  const confirm = useConfirm();
  const { run, isBusy } = useRunner();
  const { data, error, reload } = useAdminData<AdminEvent[]>('/admin/events');
  const { data: wedding } = useAdminData<WeddingInfoJson | null>(
    '/admin/wedding',
  );
  const weddingDay = wedding ? vnDay(wedding.weddingDate) : null;
  const [form, setForm] = useState<EventForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tableName, setTableName] = useState<Record<string, string>>({});

  const set = (patch: Partial<EventForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, timing, ...rest } = form;
    const body: EventInput = {
      ...rest,
      ...timing,
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
      !(await confirm({
        title: `Xoá sự kiện "${ev.name}"?`,
        description:
          'RSVP và bàn tiệc của sự kiện này cũng bị xoá. Không thể hoàn tác.',
      }))
    )
      return;
    await run(
      ev.id,
      async () => {
        await api(`/admin/events/${ev.id}`, { method: 'DELETE' });
        await reload();
      },
      'Đã xoá sự kiện',
    );
  }

  async function addTable(e: React.FormEvent, eventId: string) {
    e.preventDefault();
    const name = tableName[eventId]?.trim();
    if (!name) return;
    await run(
      `table-${eventId}`,
      async () => {
        await api(`/admin/events/${eventId}/tables`, { body: { name } });
        setTableName((t) => ({ ...t, [eventId]: '' }));
        await reload();
      },
      `Đã thêm ${name}`,
    );
  }

  async function removeTable(id: string, name: string) {
    if (
      !(await confirm({
        title: `Xoá ${name}?`,
        description: 'Khách đã xếp vào bàn này sẽ trở về "Chưa xếp bàn".',
      }))
    )
      return;
    await run(
      id,
      async () => {
        await api(`/admin/tables/${id}`, { method: 'DELETE' });
        await reload();
      },
      `Đã xoá ${name}`,
    );
  }

  return (
    <>
      <PageHeader
        title="Sự kiện & bàn tiệc"
        actions={
          <>
            <ExportButton
              fileName="Su kien va ban tiec"
              disabled={!data}
              sheets={() => eventSheets(data ?? [])}
            />
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
          </>
        }
      />
      <ErrorAlert error={error} onRetry={reload} />
      {!data && !error && <ListSkeleton rows={2} />}

      <div className="grid gap-5">
        {data?.map((ev) => (
          <Card key={ev.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-2xl text-rose-deep">
                  {ev.name}
                </span>
                <Badge variant="secondary">{SIDE_LABEL[ev.side]}</Badge>
              </CardTitle>
              <CardDescription
                className={`mt-1 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap
                sm:gap-x-5`}
              >
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <CalendarClockIcon aria-hidden className="size-4 shrink-0" />
                  {offsetLabel(ev.dayOffset)}, {formatDateTime(ev.startAt)}
                </span>
                <span className="inline-flex items-start gap-1.5">
                  <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-medium text-foreground">
                      {ev.venueName}
                    </span>{' '}
                    — {ev.address}
                  </span>
                </span>
              </CardDescription>
              <CardAction className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="max-sm:size-11"
                  title="Sửa"
                  aria-label={`Sửa sự kiện ${ev.name}`}
                  onClick={() => {
                    setFormError(null);
                    setForm({
                      id: ev.id,
                      name: ev.name,
                      side: ev.side,
                      timing: {
                        dayOffset: ev.dayOffset,
                        startTime: ev.startTime,
                        endTime: ev.endTime,
                      },
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
                  size="icon"
                  className="max-sm:size-11"
                  title="Xoá"
                  aria-label={`Xoá sự kiện ${ev.name}`}
                  disabled={isBusy(ev.id)}
                  onClick={() => removeEvent(ev)}
                >
                  <Trash2Icon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="border-t pt-5">
              <h3
                className={`mb-3 flex items-center gap-2 text-sm font-semibold
                tracking-wide text-muted-foreground uppercase`}
              >
                <UtensilsIcon aria-hidden className="size-4" />
                Bàn tiệc
                <span
                  className={`rounded-full bg-muted px-2 py-0.5 text-xs
                  text-foreground tabular-nums`}
                >
                  {ev.tables.length}
                </span>
              </h3>
              {!ev.tables.length && (
                <p
                  className={`rounded-xl border border-dashed p-4 text-center
                  text-sm text-muted-foreground`}
                >
                  Chưa có bàn nào — thêm bàn bên dưới.
                </p>
              )}
              <div
                className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))]
                gap-3`}
              >
                {ev.tables.map((t) => {
                  const seated = t.seats.reduce(
                    (n, s) => n + s.attendingCount,
                    0,
                  );
                  const over = seated > t.capacity;
                  const fill = t.capacity
                    ? Math.min(100, (seated / t.capacity) * 100)
                    : 0;
                  return (
                    <Card
                      key={t.id}
                      size="sm"
                      className="bg-muted/30 shadow-none"
                    >
                      <CardHeader>
                        <CardTitle>{t.name}</CardTitle>
                        <CardAction>
                          <Badge
                            variant={over ? 'destructive' : 'secondary'}
                            className="tabular-nums"
                          >
                            {over ? (
                              <TriangleAlertIcon aria-hidden />
                            ) : (
                              <UsersIcon aria-hidden />
                            )}
                            {seated}/{t.capacity}
                            {over && (
                              <span className="sr-only"> — quá chỗ</span>
                            )}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3">
                        <div
                          aria-hidden
                          className={`h-1.5 overflow-hidden rounded-full
                          bg-muted`}
                        >
                          <div
                            className={`h-full rounded-full transition-[width]
                            ${over ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                        {t.seats.length ? (
                          <ul className="flex flex-col gap-1 text-sm">
                            {t.seats.map((s) => (
                              <li
                                key={s.invitationId}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate">
                                  {s.invitation.name}
                                </span>
                                <span
                                  className={`text-muted-foreground
                                    tabular-nums`}
                                >
                                  {s.attendingCount}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Chưa xếp khách.
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`mt-auto self-start text-destructive
                          hover:bg-destructive/10 hover:text-destructive
                          max-sm:h-11`}
                          disabled={isBusy(t.id)}
                          onClick={() => removeTable(t.id, t.name)}
                        >
                          <Trash2Icon data-icon="inline-start" aria-hidden />
                          Xoá bàn
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => addTable(e, ev.id)}
                className={`mt-4 flex flex-col gap-2 rounded-xl bg-muted/40 p-3
                sm:flex-row sm:items-center`}
              >
                <Input
                  className="sm:max-w-64"
                  aria-label={`Tên bàn mới cho ${ev.name}`}
                  placeholder="Tên bàn (vd: Bàn 4)"
                  value={tableName[ev.id] ?? ''}
                  onChange={(e) =>
                    setTableName((t) => ({ ...t, [ev.id]: e.target.value }))
                  }
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="max-sm:h-11"
                  disabled={
                    isBusy(`table-${ev.id}`) || !tableName[ev.id]?.trim()
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Thêm bàn
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Xếp khách vào bàn ở trang Thiệp mời → Sửa.
              </p>
            </CardContent>
          </Card>
        ))}
        {data && !data.length && (
          <Empty
            icon={<CalendarHeartIcon />}
            title="Chưa có sự kiện nào"
            description="Thêm lễ vu quy, lễ thành hôn hay tiệc cưới để khách RSVP."
          />
        )}
      </div>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa sự kiện' : 'Thêm sự kiện'}
        description="Giờ sự kiện tính theo ngày cưới; đổi ngày cưới trong Cài đặt thì sự kiện tự dời theo."
        error={formError}
        value={form}
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
            <EventTimingFields
              value={form.timing}
              onChange={(timing) => set({ timing })}
              weddingDay={weddingDay}
            />
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
