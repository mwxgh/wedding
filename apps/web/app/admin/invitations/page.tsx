'use client';

import { useMemo, useState } from 'react';

import {
  CopyIcon,
  EyeIcon,
  MailOpenIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from 'lucide-react';

import type {
  AdminEvent,
  AdminInvitation,
  InvitationInput,
  Relation,
  Side,
} from '@repo/types';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card } from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
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
import { Textarea } from '@repo/ui/components/textarea';

import { FieldRow, FormField, StatusBadge } from '../../_components/common';
import {
  RELATION_LABEL,
  RSVP_LABEL,
  SIDE_LABEL,
  formatDateTime,
} from '../../_lib/format';
import { useAdminData, useAuth } from '../_lib/auth';
import { invitationSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, PageHeader } from '../_lib/ui';

type GuestForm = { name: string; isChild: boolean };

interface FormState {
  id?: string;
  name: string;
  side: Side;
  relation: Relation;
  maxGuests: number;
  phone: string;
  note: string;
  guests: GuestForm[];
  eventIds: string[];
  tables: Record<string, string>; // eventId -> tableId
}

const emptyForm = (eventIds: string[]): FormState => ({
  name: '',
  side: 'GROOM',
  relation: 'FRIEND',
  maxGuests: 1,
  phone: '',
  note: '',
  guests: [],
  eventIds,
  tables: {},
});

const toForm = (inv: AdminInvitation): FormState => ({
  id: inv.id,
  name: inv.name,
  side: inv.side,
  relation: inv.relation,
  maxGuests: inv.maxGuests,
  phone: inv.phone ?? '',
  note: inv.note ?? '',
  guests: inv.guests.map((g) => ({ name: g.name, isChild: g.isChild })),
  eventIds: inv.events.map((e) => e.eventId),
  tables: Object.fromEntries(
    inv.events.map((e) => [e.eventId, e.tableId ?? '']),
  ),
});

export default function InvitationsPage() {
  const { api } = useAuth();
  const { data, error, reload } =
    useAdminData<AdminInvitation[]>('/admin/invitations');
  const { data: events } = useAdminData<AdminEvent[]>('/admin/events');
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'' | Side>('');
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      (data ?? []).filter(
        (i) =>
          (!filter || i.side === filter) &&
          (!query || i.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [data, filter, query],
  );

  const totalGuests = list.reduce((n, i) => n + i.maxGuests, 0);

  const open = (f: FormState) => {
    setFormError(null);
    setForm(f);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setFormError(null);
    const { id, tables, ...rest } = form;
    const body: InvitationInput = {
      ...rest,
      phone: rest.phone || undefined,
      note: rest.note || undefined,
    };
    try {
      const saved = await api<AdminInvitation>(
        id ? `/admin/invitations/${id}` : '/admin/invitations',
        { method: id ? 'PATCH' : 'POST', body },
      );
      // Table seating is stored per invitation + event
      await Promise.all(
        form.eventIds.map((eventId) => {
          const current =
            saved.events.find((ev) => ev.eventId === eventId)?.tableId ?? '';
          const next = tables[eventId] ?? '';
          return current === next
            ? null
            : api(`/admin/invitations/${saved.id}/events/${eventId}`, {
                method: 'PATCH',
                body: { tableId: next || null },
              });
        }),
      );
      setForm(null);
      toast.success(id ? 'Đã cập nhật thiệp mời' : 'Đã tạo thiệp mời');
      await reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function remove(inv: AdminInvitation) {
    if (!confirm(`Xoá thiệp mời "${inv.name}"?`)) return;
    await api(`/admin/invitations/${inv.id}`, { method: 'DELETE' });
    toast.success('Đã xoá thiệp mời');
    await reload();
  }

  async function copyLink(inv: AdminInvitation) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/i/${inv.code}`,
    );
    toast.success(`Đã copy link thiệp của ${inv.name}`);
  }

  const set = (patch: Partial<FormState>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <>
      <PageHeader
        title="Thiệp mời & RSVP"
        actions={
          <>
            <ExportButton
              fileName="Thiep moi va RSVP"
              disabled={!data || !events}
              sheets={() =>
                invitationSheets(list, events ?? [], window.location.origin)
              }
            />
            <Button
              size="lg"
              onClick={() => open(emptyForm(events?.map((e) => e.id) ?? []))}
            >
              <PlusIcon data-icon="inline-start" />
              Tạo thiệp mời
            </Button>
          </>
        }
      />
      <ErrorAlert error={error} />

      <div
        className={`mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-3
          shadow-soft sm:flex-row sm:items-center`}
      >
        <div className="relative w-full sm:max-w-72">
          <SearchIcon
            aria-hidden
            className={`pointer-events-none absolute top-1/2 left-3 size-4
              -translate-y-1/2 text-muted-foreground`}
          />
          <Input
            type="search"
            aria-label="Tìm theo tên"
            className="pl-9"
            placeholder="Tìm theo tên…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <NativeSelect
          aria-label="Lọc theo bên"
          className="w-full sm:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Side | '')}
        >
          <NativeSelectOption value="">Tất cả</NativeSelectOption>
          <NativeSelectOption value="GROOM">Nhà trai</NativeSelectOption>
          <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
          <NativeSelectOption value="BOTH">Hai họ</NativeSelectOption>
        </NativeSelect>
        <p
          className={`flex items-center gap-2 text-sm text-muted-foreground
            tabular-nums sm:ml-auto`}
        >
          <MailOpenIcon aria-hidden className="size-4" />
          <span>
            <strong className="font-semibold text-foreground">
              {list.length}
            </strong>{' '}
            thiệp · tối đa{' '}
            <strong className="font-semibold text-foreground">
              {totalGuests}
            </strong>{' '}
            khách
          </span>
        </p>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Bên</TableHead>
              <TableHead className="text-right">Khách</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Đã mở</TableHead>
              <TableHead>
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="max-w-80 align-top whitespace-normal">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`grid size-9 shrink-0 place-items-center
                      rounded-full bg-secondary font-serif text-sm font-semibold
                      text-secondary-foreground`}
                    >
                      {inv.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {RELATION_LABEL[inv.relation]}
                        {inv.guests.length > 0 &&
                          ` · ${inv.guests.map((g) => g.name).join(', ')}`}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline">{SIDE_LABEL[inv.side]}</Badge>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <UsersIcon
                      aria-hidden
                      className="size-3.5 text-muted-foreground"
                    />
                    {inv.maxGuests}
                  </span>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    {inv.events.map((ev) => (
                      <div
                        key={ev.eventId}
                        className="flex items-center gap-1.5"
                      >
                        <StatusBadge status={ev.status}>
                          {RSVP_LABEL[ev.status]}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {ev.event.name}
                          {ev.status === 'ATTENDING' &&
                            ` · ${ev.attendingCount} người`}
                          {ev.table && ` · ${ev.table.name}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {inv.openedAt ? (
                    <span
                      className={
                        'inline-flex items-center gap-1.5 tabular-nums'
                      }
                    >
                      <EyeIcon aria-hidden className="size-3.5 text-primary" />
                      {formatDateTime(inv.openedAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Chưa mở</span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="max-sm:size-11"
                      title="Copy link"
                      aria-label={`Copy link thiệp của ${inv.name}`}
                      onClick={() => copyLink(inv)}
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="max-sm:size-11"
                      title="Sửa"
                      aria-label={`Sửa thiệp của ${inv.name}`}
                      onClick={() => open(toForm(inv))}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="max-sm:size-11"
                      title="Xoá"
                      aria-label={`Xoá thiệp của ${inv.name}`}
                      onClick={() => remove(inv)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data && !list.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-14">
                  <div
                    className={`flex flex-col items-center gap-2 text-center
                    text-muted-foreground`}
                  >
                    <span
                      className={`grid size-12 place-items-center rounded-full
                      bg-secondary text-secondary-foreground`}
                    >
                      <MailOpenIcon aria-hidden className="size-5" />
                    </span>
                    <p className="font-medium text-foreground">
                      Chưa có thiệp mời nào
                    </p>
                    <p className="text-sm">
                      Bấm “Tạo thiệp mời” để gửi lời mời đầu tiên.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa thiệp mời' : 'Tạo thiệp mời'}
        description="Mỗi thiệp có một đường link riêng để khách xem và RSVP."
        error={formError}
        onClose={() => setForm(null)}
        onSubmit={save}
      >
        {form && (
          <>
            <FormField label="Tên hiển thị trên thiệp (vd: Gia đình anh Nam)">
              <Input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
            </FormField>
            <FieldRow>
              <FormField label="Khách bên">
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
              <FormField label="Quan hệ">
                <NativeSelect
                  className="w-full"
                  value={form.relation}
                  onChange={(e) =>
                    set({ relation: e.target.value as Relation })
                  }
                >
                  {Object.entries(RELATION_LABEL).map(([v, l]) => (
                    <NativeSelectOption key={v} value={v}>
                      {l}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Số khách tối đa">
                <Input
                  type="number"
                  min={1}
                  value={form.maxGuests}
                  onChange={(e) => set({ maxGuests: Number(e.target.value) })}
                />
              </FormField>
            </FieldRow>
            <FormField label="Số điện thoại">
              <Input
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </FormField>

            <FormField label="Thành viên (tuỳ chọn)">
              <div className="flex flex-col gap-2">
                {form.guests.map((g, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-xl border
                    bg-muted/30 p-2`}
                  >
                    <Input
                      value={g.name}
                      aria-label={`Tên thành viên ${i + 1}`}
                      placeholder="Tên"
                      onChange={(e) =>
                        set({
                          guests: form.guests.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                      required
                    />
                    <label
                      className={`flex items-center gap-1.5 text-sm
                      whitespace-nowrap`}
                    >
                      <Checkbox
                        checked={g.isChild}
                        onCheckedChange={(checked) =>
                          set({
                            guests: form.guests.map((x, j) =>
                              j === i ? { ...x, isChild: checked } : x,
                            ),
                          })
                        }
                      />
                      Trẻ em
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="max-sm:size-11"
                      aria-label={`Bỏ thành viên ${i + 1}`}
                      onClick={() =>
                        set({ guests: form.guests.filter((_, j) => j !== i) })
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() =>
                    set({
                      guests: [...form.guests, { name: '', isChild: false }],
                    })
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Thêm thành viên
                </Button>
              </div>
            </FormField>

            <FormField label="Mời dự sự kiện & xếp bàn">
              <div className="flex flex-col gap-2">
                {events?.map((ev) => {
                  const checked = form.eventIds.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className={`flex flex-wrap items-center gap-2 rounded-xl
                      border p-2.5 transition-colors
                      has-data-checked:border-primary/40
                      has-data-checked:bg-secondary/50`}
                    >
                      <label
                        className={`flex min-h-8 flex-1 items-center gap-2
                        text-sm font-medium`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(on) =>
                            set({
                              eventIds: on
                                ? [...form.eventIds, ev.id]
                                : form.eventIds.filter((x) => x !== ev.id),
                            })
                          }
                        />
                        {ev.name}
                      </label>
                      {checked && ev.tables.length > 0 && (
                        <NativeSelect
                          aria-label={`Bàn tại ${ev.name}`}
                          value={form.tables[ev.id] ?? ''}
                          onChange={(e) =>
                            set({
                              tables: {
                                ...form.tables,
                                [ev.id]: e.target.value,
                              },
                            })
                          }
                        >
                          <NativeSelectOption value="">
                            Chưa xếp bàn
                          </NativeSelectOption>
                          {ev.tables.map((t) => (
                            <NativeSelectOption key={t.id} value={t.id}>
                              {t.name} (
                              {t.seats.reduce(
                                (n, s) => n + s.attendingCount,
                                0,
                              )}
                              /{t.capacity})
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Ghi chú nội bộ">
              <Textarea
                value={form.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  );
}
