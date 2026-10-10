'use client';

import { useMemo, useState } from 'react';

import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import type {
  AdminEvent,
  AdminInvitation,
  InvitationInput,
  Relation,
  Side,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
import { Card } from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
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
          <Button
            size="lg"
            onClick={() => open(emptyForm(events?.map((e) => e.id) ?? []))}
          >
            <PlusIcon data-icon="inline-start" />
            Tạo thiệp mời
          </Button>
        }
      />
      <ErrorAlert error={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-64"
          placeholder="Tìm theo tên…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect
          value={filter}
          onChange={(e) => setFilter(e.target.value as Side | '')}
        >
          <NativeSelectOption value="">Tất cả</NativeSelectOption>
          <NativeSelectOption value="GROOM">Nhà trai</NativeSelectOption>
          <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
          <NativeSelectOption value="BOTH">Hai họ</NativeSelectOption>
        </NativeSelect>
        <span className="text-muted-foreground">
          {list.length} thiệp · tối đa {totalGuests} khách
        </span>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Bên</TableHead>
              <TableHead>Khách</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Đã mở</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="align-top">
                  <p className="font-medium">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {RELATION_LABEL[inv.relation]}
                    {inv.guests.length > 0 &&
                      ` · ${inv.guests.map((g) => g.name).join(', ')}`}
                  </p>
                </TableCell>
                <TableCell className="align-top">
                  {SIDE_LABEL[inv.side]}
                </TableCell>
                <TableCell className="align-top">{inv.maxGuests}</TableCell>
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
                        <span className="text-xs">
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
                  {inv.openedAt ? formatDateTime(inv.openedAt) : '—'}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Copy link"
                      onClick={() => copyLink(inv)}
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Sửa"
                      onClick={() => open(toForm(inv))}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      title="Xoá"
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
                <TableCell colSpan={6} className="text-muted-foreground">
                  Chưa có thiệp mời nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <FormDialog
        open={!!form}
        title={form?.id ? 'Sửa thiệp mời' : 'Tạo thiệp mời'}
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
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={g.name}
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
                      className="flex items-center gap-1.5 text-sm
                        whitespace-nowrap"
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
                      size="icon-sm"
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
                    <div key={ev.id} className="flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-2 text-sm">
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
