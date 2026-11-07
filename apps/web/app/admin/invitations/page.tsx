'use client';

import { type ReactNode, useMemo, useState } from 'react';

import {
  ArrowDownUpIcon,
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
  RsvpStatus,
  Side,
} from '@repo/types';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card } from '@repo/ui/components/card';
import { Checkbox } from '@repo/ui/components/checkbox';
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
import { Textarea } from '@repo/ui/components/textarea';
import { matchesQuery } from '@repo/utils';

import { FieldRow, FormField, StatusBadge } from '../../_components/common';
import {
  RELATION_LABEL,
  RSVP_LABEL,
  SIDE_LABEL,
  formatDateTime,
} from '../../_lib/format';
import { useQueryParam, useRunner, useSetQuery } from '../_lib/actions';
import { useAdminData, useAuth } from '../_lib/auth';
import { invitationSheets } from '../_lib/exports';
import { ErrorAlert, FormDialog, ListSkeleton, PageHeader } from '../_lib/ui';

type GuestForm = { name: string; isChild: boolean };

interface FormState {
  id?: string;
  name: string;
  side: Side;
  relation: Relation;
  maxGuests: number;
  groupName: string;
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
  groupName: '',
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
  groupName: inv.groupName ?? '',
  phone: inv.phone ?? '',
  note: inv.note ?? '',
  guests: inv.guests.map((g) => ({ name: g.name, isChild: g.isChild })),
  eventIds: inv.events.map((e) => e.eventId),
  tables: Object.fromEntries(
    inv.events.map((e) => [e.eventId, e.tableId ?? '']),
  ),
});

type RsvpFilter = '' | RsvpStatus | 'UNOPENED';
type SortKey = '' | 'name' | 'guests' | 'opened';

const SORTS: Record<Exclude<SortKey, ''>, string> = {
  name: 'Tên A → Z',
  guests: 'Nhiều khách nhất',
  opened: 'Mở thiệp gần nhất',
};

const NO_GROUP = '__none';

const byName = new Intl.Collator('vi-VN', { sensitivity: 'base' });

const sorters: Record<
  Exclude<SortKey, ''>,
  (a: AdminInvitation, b: AdminInvitation) => number
> = {
  name: (a, b) => byName.compare(a.name, b.name),
  guests: (a, b) => b.maxGuests - a.maxGuests,
  opened: (a, b) =>
    (b.openedAt ? Date.parse(b.openedAt) : 0) -
    (a.openedAt ? Date.parse(a.openedAt) : 0),
};

/** Group (e.g. "HUS") shown next to the name so same-name guests are told apart. */
function groupTag(inv: { groupName: string | null }) {
  return inv.groupName ? (
    <Badge variant="secondary" className="ml-1.5 align-middle font-normal">
      {inv.groupName}
    </Badge>
  ) : null;
}

export default function InvitationsPage() {
  const { api } = useAuth();
  const confirm = useConfirm();
  const { run, isBusy } = useRunner();
  const { data, error, reload } =
    useAdminData<AdminInvitation[]>('/admin/invitations');
  const { data: events } = useAdminData<AdminEvent[]>('/admin/events');
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // filters live in the URL so a refresh or a shared link keeps them
  const [sideParam, setFilter] = useQueryParam('side');
  const [rsvpParam, setRsvp] = useQueryParam('rsvp');
  const [sortParam, setSort] = useQueryParam('sort');
  const [groupParam, setGroup] = useQueryParam('group');
  const [queryParam, setQueryParam] = useQueryParam('q');
  // typed text stays local (instant); the URL follows it
  const [query, setQueryText] = useState(queryParam ?? '');
  const setQuery = (q: string) => {
    setQueryText(q);
    setQueryParam(q.trim() || null);
  };
  const setQueryParams = useSetQuery();
  const filter = (sideParam ?? '') as '' | Side;
  const rsvp = (rsvpParam ?? '') as RsvpFilter;
  const sort = (sortParam ?? '') as SortKey;
  const group = groupParam ?? '';
  const filtered = !!(filter || rsvp || group || query);

  // Groups of the chosen side, with counts, for the filter and the form suggestions
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of data ?? []) {
      if (!i.groupName || (filter && i.side !== filter)) continue;
      counts.set(i.groupName, (counts.get(i.groupName) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => byName.compare(a, b));
  }, [data, filter]);
  const allGroups = useMemo(
    () =>
      [...new Set((data ?? []).flatMap((i) => i.groupName ?? []))].sort(
        byName.compare,
      ),
    [data],
  );
  const ungrouped = (data ?? []).some(
    (i) => !i.groupName && (!filter || i.side === filter),
  );

  const list = useMemo(() => {
    const rows = (data ?? []).filter(
      (i) =>
        (!filter || i.side === filter) &&
        (!group ||
          (group === NO_GROUP ? !i.groupName : i.groupName === group)) &&
        (!rsvp ||
          (rsvp === 'UNOPENED'
            ? !i.openedAt
            : i.events.some((e) => e.status === rsvp))) &&
        (!query ||
          matchesQuery(
            query,
            i.name,
            i.groupName,
            i.note,
            i.phone,
            ...i.guests.map((g) => g.name),
          )),
    );
    return sort && sorters[sort] ? [...rows].sort(sorters[sort]) : rows;
  }, [data, filter, group, rsvp, query, sort]);

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
      groupName: rest.groupName.trim() || undefined,
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
    if (
      !(await confirm({
        title: `Xoá thiệp mời "${inv.name}"?`,
        description:
          'Link thiệp sẽ ngừng hoạt động và RSVP của thiệp này bị xoá. Không thể hoàn tác.',
      }))
    )
      return;
    await run(
      inv.id,
      async () => {
        await api(`/admin/invitations/${inv.id}`, { method: 'DELETE' });
        await reload();
      },
      'Đã xoá thiệp mời',
    );
  }

  const copyLink = (inv: AdminInvitation) =>
    run(
      `copy-${inv.id}`,
      () =>
        navigator.clipboard.writeText(
          `${window.location.origin}/i/${inv.code}`,
        ),
      `Đã copy link thiệp của ${inv.name}`,
    );

  const actions = (inv: AdminInvitation) => (
    <>
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
        disabled={isBusy(inv.id)}
        onClick={() => remove(inv)}
      >
        <Trash2Icon />
      </Button>
    </>
  );

  const rsvpList = (inv: AdminInvitation) => (
    <div className="flex flex-col gap-1">
      {inv.events.map((ev) => (
        <div key={ev.eventId} className="flex items-center gap-1.5">
          <StatusBadge status={ev.status}>{RSVP_LABEL[ev.status]}</StatusBadge>
          <span className="text-xs text-muted-foreground">
            {ev.event.name}
            {ev.status === 'ATTENDING' && ` · ${ev.attendingCount} người`}
            {ev.table && ` · ${ev.table.name}`}
          </span>
        </div>
      ))}
    </div>
  );

  const openedLabel = (inv: AdminInvitation) =>
    inv.openedAt ? (
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <EyeIcon aria-hidden className="size-3.5 text-primary" />
        {formatDateTime(inv.openedAt)}
      </span>
    ) : (
      <span className="text-muted-foreground">Chưa mở</span>
    );

  const emptyState: ReactNode =
    filtered && data?.length ? (
      <Empty
        bare
        icon={<SearchIcon />}
        title="Không tìm thấy thiệp mời nào"
        description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setQueryText('');
              setQueryParams({ q: null, side: null, rsvp: null, group: null });
            }}
          >
            Xoá bộ lọc
          </Button>
        }
      />
    ) : (
      <Empty
        bare
        icon={<MailOpenIcon />}
        title="Chưa có thiệp mời nào"
        description="Bấm “Tạo thiệp mời” để gửi lời mời đầu tiên."
      />
    );

  const ariaSort = (key: SortKey) =>
    sort === key ? (key === 'name' ? 'ascending' : 'descending') : undefined;

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
      <ErrorAlert error={error} onRetry={reload} />

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
            placeholder="Tìm tên, thành viên, SĐT…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <NativeSelect
          aria-label="Lọc theo bên"
          className="w-full sm:w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value || null)}
        >
          <NativeSelectOption value="">Cả hai bên</NativeSelectOption>
          <NativeSelectOption value="GROOM">Nhà trai</NativeSelectOption>
          <NativeSelectOption value="BRIDE">Nhà gái</NativeSelectOption>
          <NativeSelectOption value="BOTH">Hai họ</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          aria-label="Lọc theo nhóm"
          className="w-full sm:w-auto"
          value={group}
          onChange={(e) => setGroup(e.target.value || null)}
        >
          <NativeSelectOption value="">Mọi nhóm</NativeSelectOption>
          {groups.map(([g, n]) => (
            <NativeSelectOption key={g} value={g}>
              {g} ({n})
            </NativeSelectOption>
          ))}
          {ungrouped && (
            <NativeSelectOption value={NO_GROUP}>
              Chưa có nhóm
            </NativeSelectOption>
          )}
        </NativeSelect>
        <NativeSelect
          aria-label="Lọc theo RSVP"
          className="w-full sm:w-auto"
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value || null)}
        >
          <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
          {Object.entries(RSVP_LABEL).map(([v, l]) => (
            <NativeSelectOption key={v} value={v}>
              {l}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value="UNOPENED">
            Chưa mở thiệp
          </NativeSelectOption>
        </NativeSelect>
        <div className="relative w-full sm:w-auto">
          <ArrowDownUpIcon
            aria-hidden
            className={`pointer-events-none absolute top-1/2 left-3 z-10 size-4
              -translate-y-1/2 text-muted-foreground`}
          />
          <NativeSelect
            aria-label="Sắp xếp"
            className="w-full sm:w-auto [&_select]:pl-9"
            value={sort}
            onChange={(e) => setSort(e.target.value || null)}
          >
            <NativeSelectOption value="">Mới tạo trước</NativeSelectOption>
            {Object.entries(SORTS).map(([v, l]) => (
              <NativeSelectOption key={v} value={v}>
                {l}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
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

      {!data && !error && <ListSkeleton />}

      {/* phone: one card per invitation, actions always in reach */}
      {data && (
        <ul className="grid gap-3 sm:hidden">
          {list.map((inv) => (
            <li key={inv.id}>
              <Card className="gap-3 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {inv.name}
                      {groupTag(inv)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SIDE_LABEL[inv.side]} · {RELATION_LABEL[inv.relation]} ·{' '}
                      <span className="tabular-nums">
                        tối đa {inv.maxGuests} khách
                      </span>
                    </p>
                  </div>
                </div>
                {rsvpList(inv)}
                <div className="flex items-center justify-between gap-2 text-xs">
                  {openedLabel(inv)}
                  <div className="flex gap-1">{actions(inv)}</div>
                </div>
              </Card>
            </li>
          ))}
          {!list.length && <li>{emptyState}</li>}
        </ul>
      )}

      <Card className={data ? 'py-0 max-sm:hidden' : 'hidden'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort={ariaSort('name')}>Tên</TableHead>
              <TableHead>Bên</TableHead>
              <TableHead className="text-right" aria-sort={ariaSort('guests')}>
                Khách
              </TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead aria-sort={ariaSort('opened')}>Đã mở</TableHead>
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
                      <p className="font-medium text-foreground">
                        {inv.name}
                        {groupTag(inv)}
                      </p>
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
                <TableCell className="align-top">{rsvpList(inv)}</TableCell>
                <TableCell className="align-top text-xs">
                  {openedLabel(inv)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-1">{actions(inv)}</div>
                </TableCell>
              </TableRow>
            ))}
            {data && !list.length && (
              <TableRow>
                <TableCell colSpan={6} className="whitespace-normal">
                  {emptyState}
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
        value={form}
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
            <FormField label="Nhóm (VD: FPT, Bạn cấp 3)">
              <Input
                list="invitation-groups"
                maxLength={64}
                autoComplete="off"
                value={form.groupName}
                onChange={(e) => set({ groupName: e.target.value })}
              />
            </FormField>
            <datalist id="invitation-groups">
              {allGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
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
