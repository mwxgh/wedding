import type {
  AdminEvent,
  AdminExpense,
  AdminGift,
  AdminGuestbookEntry,
  AdminInvitation,
  AdminPhoto,
  AdminTask,
  PlanSummary,
} from '@repo/contracts';
import { type ExcelColumn, excelSheet } from '@repo/ui/lib/excel';

import {
  GIFT_METHOD_LABEL,
  MODERATION_LABEL,
  PLAN_CATEGORY_LABEL,
  RELATION_LABEL,
  RSVP_LABEL,
  SIDE_LABEL,
} from '../../_lib/format';

/** Column builders per admin page: one place for every Excel layout. */

const paidOf = (e: AdminExpense) =>
  e.payments.reduce((n, p) => n + Number(p.amount), 0);

// ---------- invitations ----------

export function invitationSheets(
  invitations: AdminInvitation[],
  events: AdminEvent[],
  origin: string,
) {
  // one RSVP / headcount / table column group per event, in event order
  const perEvent = events.flatMap((ev): ExcelColumn<AdminInvitation>[] => {
    const of = (i: AdminInvitation) =>
      i.events.find((x) => x.eventId === ev.id);
    return [
      {
        header: `${ev.name} · RSVP`,
        value: (i) => {
          const x = of(i);
          return x ? RSVP_LABEL[x.status] : 'Không mời';
        },
        width: 16,
      },
      {
        header: `${ev.name} · Số người`,
        value: (i) => of(i)?.attendingCount,
        format: 'int',
      },
      {
        header: `${ev.name} · Bàn`,
        value: (i) => of(i)?.table?.name,
        width: 12,
      },
    ];
  });

  const rsvps = invitations.flatMap((i) => i.events.map((x) => ({ i, x })));
  const guests = invitations.flatMap((i) => i.guests.map((g) => ({ i, g })));
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  return [
    excelSheet<AdminInvitation>({
      name: 'Thiệp mời',
      rows: invitations,
      columns: [
        { header: 'Mã', value: (i) => i.code, width: 10 },
        { header: 'Tên thiệp', value: (i) => i.name, width: 28 },
        { header: 'Nhà', value: (i) => SIDE_LABEL[i.side], width: 10 },
        {
          header: 'Quan hệ',
          value: (i) => RELATION_LABEL[i.relation],
          width: 12,
        },
        { header: 'Số khách', value: (i) => i.maxGuests, format: 'int' },
        { header: 'Điện thoại', value: (i) => i.phone, width: 14 },
        {
          header: 'Đã mở thiệp lúc',
          value: (i) => i.openedAt,
          format: 'datetime',
          width: 17,
        },
        ...perEvent,
        { header: 'Link thiệp', value: (i) => `${origin}/i/${i.code}` },
        { header: 'Ghi chú', value: (i) => i.note, width: 30 },
      ],
    }),
    excelSheet<(typeof guests)[number]>({
      name: 'Danh sách khách',
      rows: guests,
      columns: [
        { header: 'Thiệp', value: ({ i }) => i.name, width: 28 },
        { header: 'Nhà', value: ({ i }) => SIDE_LABEL[i.side], width: 10 },
        { header: 'Tên khách', value: ({ g }) => g.name, width: 24 },
        { header: 'Trẻ em', value: ({ g }) => g.isChild },
        {
          header: 'Ăn uống / dị ứng',
          value: ({ g }) => g.dietaryNote,
          width: 28,
        },
      ],
    }),
    excelSheet<(typeof rsvps)[number]>({
      name: 'RSVP theo sự kiện',
      rows: rsvps,
      columns: [
        {
          header: 'Sự kiện',
          value: ({ x }) => eventName.get(x.eventId) ?? x.event.name,
          width: 20,
        },
        { header: 'Thiệp', value: ({ i }) => i.name, width: 28 },
        { header: 'Nhà', value: ({ i }) => SIDE_LABEL[i.side], width: 10 },
        {
          header: 'Trạng thái',
          value: ({ x }) => RSVP_LABEL[x.status],
          width: 14,
        },
        {
          header: 'Số người',
          value: ({ x }) => x.attendingCount,
          format: 'int',
        },
        { header: 'Bàn', value: ({ x }) => x.table?.name, width: 12 },
        {
          header: 'Phản hồi lúc',
          value: ({ x }) => x.respondedAt,
          format: 'datetime',
          width: 17,
        },
        { header: 'Lời nhắn', value: ({ x }) => x.message, width: 40 },
      ],
    }),
  ];
}

// ---------- events & tables ----------

type Table = AdminEvent['tables'][number];
interface SeatRow {
  ev: AdminEvent;
  t: Table;
  /** null for an empty table, so it still shows in the plan */
  s: Table['seats'][number] | null;
}

export function eventSheets(events: AdminEvent[]) {
  const seats = events.flatMap((ev): SeatRow[] =>
    ev.tables.flatMap((t): SeatRow[] =>
      t.seats.length
        ? t.seats.map((s) => ({ ev, t, s }))
        : [{ ev, t, s: null }],
    ),
  );
  return [
    excelSheet<AdminEvent>({
      name: 'Sự kiện',
      rows: events,
      columns: [
        { header: 'Sự kiện', value: (e) => e.name, width: 24 },
        { header: 'Nhà', value: (e) => SIDE_LABEL[e.side], width: 10 },
        {
          header: 'Bắt đầu',
          value: (e) => e.startAt,
          format: 'datetime',
          width: 17,
        },
        {
          header: 'Kết thúc',
          value: (e) => e.endAt,
          format: 'datetime',
          width: 17,
        },
        { header: 'Địa điểm', value: (e) => e.venueName, width: 24 },
        { header: 'Địa chỉ', value: (e) => e.address, width: 36 },
        { header: 'Số bàn', value: (e) => e.tables.length, format: 'int' },
        {
          header: 'Tổng chỗ',
          value: (e) => e.tables.reduce((n, t) => n + t.capacity, 0),
          format: 'int',
        },
        {
          header: 'Đã xếp',
          value: (e) =>
            e.tables.reduce(
              (n, t) => n + t.seats.reduce((m, s) => m + s.attendingCount, 0),
              0,
            ),
          format: 'int',
        },
        { header: 'Bản đồ', value: (e) => e.mapUrl, width: 30 },
      ],
    }),
    excelSheet<SeatRow>({
      name: 'Sơ đồ bàn',
      rows: seats,
      columns: [
        { header: 'Sự kiện', value: ({ ev }) => ev.name, width: 24 },
        { header: 'Bàn', value: ({ t }) => t.name, width: 12 },
        { header: 'Sức chứa', value: ({ t }) => t.capacity, format: 'int' },
        {
          header: 'Thiệp',
          value: ({ s }) => s?.invitation.name ?? '(trống)',
          width: 28,
        },
        {
          header: 'Trạng thái',
          value: ({ s }) => (s ? RSVP_LABEL[s.status] : null),
          width: 14,
        },
        {
          header: 'Số người',
          value: ({ s }) => s?.attendingCount,
          format: 'int',
        },
      ],
    }),
  ];
}

// ---------- gifts ----------

export const giftSheets = (gifts: AdminGift[]) => [
  excelSheet<AdminGift>({
    name: 'Mừng cưới',
    rows: gifts,
    columns: [
      {
        header: 'Ngày nhận',
        value: (g) => g.receivedAt,
        format: 'datetime',
        width: 17,
      },
      { header: 'Người mừng', value: (g) => g.giverName, width: 24 },
      { header: 'Thiệp', value: (g) => g.invitation?.name, width: 24 },
      { header: 'Sự kiện', value: (g) => g.event?.name, width: 20 },
      {
        header: 'Hình thức',
        value: (g) => GIFT_METHOD_LABEL[g.method],
        width: 14,
      },
      {
        header: 'Số tiền',
        value: (g) => (g.amount === null ? null : Number(g.amount)),
        format: 'money',
        width: 16,
      },
      { header: 'Mô tả', value: (g) => g.description, width: 30 },
    ],
  }),
];

// ---------- guestbook & photos ----------

export const guestbookSheets = (entries: AdminGuestbookEntry[]) => [
  excelSheet<AdminGuestbookEntry>({
    name: 'Sổ lưu bút',
    rows: entries,
    columns: [
      {
        header: 'Thời gian',
        value: (e) => e.createdAt,
        format: 'datetime',
        width: 17,
      },
      { header: 'Người viết', value: (e) => e.authorName, width: 22 },
      { header: 'Thiệp', value: (e) => e.invitation?.name, width: 24 },
      {
        header: 'Trạng thái',
        value: (e) => MODERATION_LABEL[e.status],
        width: 12,
      },
      { header: 'Lời chúc', value: (e) => e.message, width: 60 },
    ],
  }),
];

export const photoSheets = (photos: AdminPhoto[]) => [
  excelSheet<AdminPhoto>({
    name: 'Ảnh',
    rows: photos,
    columns: [
      {
        header: 'Ngày gửi',
        value: (p) => p.createdAt,
        format: 'datetime',
        width: 17,
      },
      { header: 'Album', value: (p) => p.album?.title, width: 20 },
      { header: 'Người gửi', value: (p) => p.invitation?.name, width: 22 },
      { header: 'Chú thích', value: (p) => p.caption, width: 30 },
      {
        header: 'Trạng thái',
        value: (p) => MODERATION_LABEL[p.status],
        width: 12,
      },
      {
        header: 'Kích thước (KB)',
        value: (p) => Math.round(p.sizeBytes / 1024),
        format: 'int',
      },
      { header: 'Link ảnh', value: (p) => p.url, width: 40 },
    ],
  }),
];

// ---------- plan ----------

export function planSheets(
  summary: PlanSummary,
  expenses: AdminExpense[],
  tasks: AdminTask[],
) {
  const payments = expenses.flatMap((e) => e.payments.map((p) => ({ e, p })));
  return [
    excelSheet<PlanSummary['byCategory'][number]>({
      name: 'Tổng hợp',
      rows: summary.byCategory,
      columns: [
        {
          header: 'Hạng mục',
          value: (c) => PLAN_CATEGORY_LABEL[c.category],
          width: 20,
        },
        { header: 'Số khoản', value: (c) => c.count, format: 'int' },
        {
          header: 'Dự kiến',
          value: (c) => Number(c.estimated),
          format: 'money',
          width: 16,
        },
        {
          header: 'Đã chi',
          value: (c) => Number(c.paid),
          format: 'money',
          width: 16,
        },
        {
          header: 'Còn phải chi',
          value: (c) => Math.max(0, Number(c.estimated) - Number(c.paid)),
          format: 'money',
          width: 16,
        },
      ],
    }),
    excelSheet<AdminExpense>({
      name: 'Khoản chi',
      rows: expenses,
      columns: [
        {
          header: 'Hạng mục',
          value: (e) => PLAN_CATEGORY_LABEL[e.category],
          width: 18,
        },
        { header: 'Khoản chi', value: (e) => e.name, width: 30 },
        { header: 'Nhà cung cấp', value: (e) => e.vendor, width: 24 },
        { header: 'Bên chi', value: (e) => SIDE_LABEL[e.side], width: 10 },
        {
          header: 'Dự kiến',
          value: (e) => Number(e.estimated),
          format: 'money',
          width: 16,
        },
        {
          header: 'Đã chi',
          value: paidOf,
          format: 'money',
          width: 16,
        },
        {
          header: 'Còn lại',
          value: (e) => Math.max(0, Number(e.estimated) - paidOf(e)),
          format: 'money',
          width: 16,
        },
        { header: 'Hạn', value: (e) => e.dueDate, format: 'date', width: 12 },
        { header: 'Ghi chú', value: (e) => e.note, width: 30 },
      ],
    }),
    excelSheet<(typeof payments)[number]>({
      name: 'Lịch sử thanh toán',
      rows: payments,
      columns: [
        {
          header: 'Ngày chi',
          value: ({ p }) => p.paidAt,
          format: 'date',
          width: 12,
        },
        { header: 'Khoản chi', value: ({ e }) => e.name, width: 30 },
        {
          header: 'Hạng mục',
          value: ({ e }) => PLAN_CATEGORY_LABEL[e.category],
          width: 18,
        },
        {
          header: 'Số tiền',
          value: ({ p }) => Number(p.amount),
          format: 'money',
          width: 16,
        },
        { header: 'Ghi chú', value: ({ p }) => p.note, width: 30 },
      ],
    }),
    excelSheet<AdminTask>({
      name: 'Việc cần làm',
      rows: tasks,
      columns: [
        { header: 'Việc', value: (t) => t.title, width: 40 },
        {
          header: 'Hạng mục',
          value: (t) => PLAN_CATEGORY_LABEL[t.category],
          width: 18,
        },
        { header: 'Hạn', value: (t) => t.dueDate, format: 'date', width: 12 },
        {
          header: 'Xong lúc',
          value: (t) => t.doneAt,
          format: 'date',
          width: 12,
        },
        {
          header: 'Phụ trách',
          value: (t) => (t.assignee ? SIDE_LABEL[t.assignee] : null),
          width: 10,
        },
        { header: 'Khoản chi', value: (t) => t.expense?.name, width: 24 },
        { header: 'Ghi chú', value: (t) => t.note, width: 30 },
      ],
    }),
  ];
}
