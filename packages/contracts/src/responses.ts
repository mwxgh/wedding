import type {
  Album,
  BankAccount,
  Event,
  Prisma,
  WeddingInfo,
} from '@repo/db/browser';

import type {
  GiftMethod,
  PlanCategory,
  Relation,
  RsvpStatus,
  Side,
} from './enums.js';
import type { Json } from './json.js';

/**
 * Response shapes. `*Data` types are what the API returns (Date, bigint);
 * the unsuffixed types are the same data after JSON serialization, for the web.
 *
 * Shapes that come from a Prisma query are derived from the `include`/`select`
 * object the API uses, so changing the schema or the query updates the types.
 */

// ---------- Query shapes shared by API and types ----------

export const publicGuestbookSelect = {
  id: true,
  authorName: true,
  message: true,
  createdAt: true,
} as const satisfies Prisma.GuestbookEntrySelect;

export const adminGuestbookInclude = {
  invitation: { select: { name: true, code: true } },
} as const satisfies Prisma.GuestbookEntryInclude;

export const adminAlbumInclude = {
  _count: { select: { photos: true } },
} as const satisfies Prisma.AlbumInclude;

export const adminPhotoInclude = {
  invitation: { select: { name: true } },
  album: { select: { title: true } },
} as const satisfies Prisma.PhotoInclude;

export const adminInvitationInclude = {
  guests: true,
  events: {
    include: { event: { select: { id: true, name: true } }, table: true },
  },
} as const satisfies Prisma.InvitationInclude;

export const adminEventInclude = {
  tables: {
    orderBy: { name: 'asc' },
    include: {
      seats: { include: { invitation: { select: { id: true, name: true } } } },
    },
  },
} as const satisfies Prisma.EventInclude;

export const adminGiftInclude = {
  invitation: { select: { id: true, name: true } },
  event: { select: { id: true, name: true } },
} as const satisfies Prisma.GiftInclude;

// ---------- Public ----------

export interface PublicWeddingData {
  info: WeddingInfo | null;
  events: Event[];
  bankAccounts: BankAccount[];
}
export type PublicWedding = Json<PublicWeddingData>;

export type PublicEventData = Event & {
  rsvp: {
    status: RsvpStatus;
    attendingCount: number;
    message: string | null;
    respondedAt: Date | null;
  };
  table: string | null;
};

export interface PublicInvitationData {
  code: string;
  name: string;
  side: Side;
  maxGuests: number;
  guests: { name: string; isChild: boolean }[];
  events: PublicEventData[];
}
export type PublicInvitation = Json<PublicInvitationData>;

export type PublicGuestbookEntryData = Prisma.GuestbookEntryGetPayload<{
  select: typeof publicGuestbookSelect;
}>;
export type PublicGuestbookEntry = Json<PublicGuestbookEntryData>;

export interface PublicPhoto {
  id: string;
  albumId: string | null;
  caption: string | null;
  url: string;
}

export interface PublicGalleryData {
  albums: Album[];
  photos: PublicPhoto[];
}
export type PublicGallery = Json<PublicGalleryData>;

// ---------- Admin ----------

export type WeddingInfoJson = Json<WeddingInfo>;
export type EventJson = Json<Event>;

export type BankAccountJson = Json<BankAccount>;

export type AdminGuestbookEntryData = Prisma.GuestbookEntryGetPayload<{
  include: typeof adminGuestbookInclude;
}>;
export type AdminGuestbookEntry = Json<AdminGuestbookEntryData>;

export type AdminAlbumData = Prisma.AlbumGetPayload<{
  include: typeof adminAlbumInclude;
}>;
export type AdminAlbum = Json<AdminAlbumData>;

export type AdminPhotoData = Prisma.PhotoGetPayload<{
  include: typeof adminPhotoInclude;
}> & { url: string };
export type AdminPhoto = Json<AdminPhotoData>;

export type AdminInvitationData = Prisma.InvitationGetPayload<{
  include: typeof adminInvitationInclude;
}>;
export type AdminInvitation = Json<AdminInvitationData>;

export type AdminEventData = Prisma.EventGetPayload<{
  include: typeof adminEventInclude;
}>;
export type AdminEvent = Json<AdminEventData>;

export type AdminGiftData = Prisma.GiftGetPayload<{
  include: typeof adminGiftInclude;
}>;
export type AdminGift = Json<AdminGiftData>;

export interface DashboardEventStat {
  id: string;
  name: string;
  startAt: Date;
  invited: number;
  attending: number;
  declined: number;
  maybe: number;
  pending: number;
  /** Guests confirmed (sum of attendingCount of ATTENDING replies). */
  headcount: number;
  /** Guests of attending invitations already given a table. */
  seated: number;
  /** Total seats of the event's tables. */
  capacity: number;
}

export interface DashboardDayStat {
  /** Day in Vietnam time, YYYY-MM-DD. */
  date: string;
  /** Invitations opened for the first time that day. */
  opened: number;
  /** Invitations that sent their first RSVP that day. */
  responded: number;
}

export interface DashboardData {
  invitations: {
    total: number;
    opened: number;
    /** Invitations that answered at least one event. */
    responded: number;
    /** Sum of maxGuests: everyone invited. */
    guests: number;
  };
  events: DashboardEventStat[];
  /** Daily activity, zero-filled, oldest first. */
  timeline: DashboardDayStat[];
  byRelation: { relation: Relation; invitations: number; guests: number }[];
  bySide: { side: Side; invitations: number; guests: number }[];
  guestbookPending: number;
  photosPending: number;
  gifts: {
    count: number;
    totalAmount: bigint;
    byMethod: { method: GiftMethod; count: number; amount: bigint }[];
  };
}
export type Dashboard = Json<DashboardData>;

// ---------- planning ----------

export const adminExpenseInclude = {
  payments: { orderBy: { paidAt: 'asc' } },
  _count: { select: { tasks: true } },
} as const satisfies Prisma.ExpenseInclude;

export type AdminExpenseData = Prisma.ExpenseGetPayload<{
  include: typeof adminExpenseInclude;
}>;
export type AdminExpense = Json<AdminExpenseData>;

export const adminTaskInclude = {
  expense: { select: { id: true, name: true } },
} as const satisfies Prisma.TaskInclude;

export type AdminTaskData = Prisma.TaskGetPayload<{
  include: typeof adminTaskInclude;
}>;
export type AdminTask = Json<AdminTaskData>;

export interface PlanSummaryData {
  weddingDate: Date | null;
  /** Target set by the couple, VND. */
  budget: bigint | null;
  /** Sum of all expenses' estimates. */
  estimated: bigint;
  /** Sum of all payments made. */
  paid: bigint;
  byCategory: {
    category: PlanCategory;
    count: number;
    estimated: bigint;
    paid: bigint;
  }[];
  tasks: { total: number; done: number; overdue: number; dueSoon: number };
  /** Next open tasks by due date (overdue first). */
  upcoming: AdminTaskData[];
}
export type PlanSummary = Json<PlanSummaryData>;
