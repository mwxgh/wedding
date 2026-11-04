import type { Album, Event, Prisma, WeddingInfo } from '@repo/db';
import type { RsvpStatus, Side } from '@repo/db';
import type {
  AdminAlbum,
  AdminEvent,
  AdminExpense,
  AdminGift,
  AdminGuestbookEntry,
  AdminInvitation,
  AdminPhoto,
  AdminTask,
  Json,
  PlanSummary,
  PublicGallery,
  PublicGuestbookEntry,
  PublicInvitation,
  PublicWedding,
  PlanSummaryData as SharedPlanSummaryData,
} from '@repo/types';

/**
 * Prisma query shapes the API returns. The web's JSON types live in
 * `@repo/types`; the checks at the bottom fail to compile when the two drift.
 */

// ---------- Query shapes ----------

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
  payment: {
    select: {
      orderCode: true,
      reference: true,
      counterAccountName: true,
      paidAt: true,
    },
  },
} as const satisfies Prisma.GiftInclude;

export const adminExpenseInclude = {
  payments: { orderBy: { paidAt: 'asc' } },
  _count: { select: { tasks: true } },
} as const satisfies Prisma.ExpenseInclude;

export const adminTaskInclude = {
  expense: { select: { id: true, name: true } },
} as const satisfies Prisma.TaskInclude;

// ---------- Public ----------

export interface PublicWeddingData {
  info: WeddingInfo | null;
  events: Event[];
  giftChannels: Side[];
}

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

export type PublicGuestbookEntryData = Prisma.GuestbookEntryGetPayload<{
  select: typeof publicGuestbookSelect;
}>;

export interface PublicGalleryData {
  albums: Album[];
  photos: PublicGallery['photos'];
}

// ---------- Admin ----------

export type AdminGuestbookEntryData = Prisma.GuestbookEntryGetPayload<{
  include: typeof adminGuestbookInclude;
}>;

export type AdminAlbumData = Prisma.AlbumGetPayload<{
  include: typeof adminAlbumInclude;
}>;

export type AdminPhotoData = Prisma.PhotoGetPayload<{
  include: typeof adminPhotoInclude;
}> & { url: string };

export type AdminInvitationData = Prisma.InvitationGetPayload<{
  include: typeof adminInvitationInclude;
}>;

export type AdminEventData = Prisma.EventGetPayload<{
  include: typeof adminEventInclude;
}>;

export type AdminGiftData = Prisma.GiftGetPayload<{
  include: typeof adminGiftInclude;
}>;

export type AdminExpenseData = Prisma.ExpenseGetPayload<{
  include: typeof adminExpenseInclude;
}>;

export type AdminTaskData = Prisma.TaskGetPayload<{
  include: typeof adminTaskInclude;
}>;

export type PlanSummaryData = SharedPlanSummaryData<AdminTaskData>;

// ---------- Drift checks: what the API sends must fit what the web expects ----------

type Fits<Sent, Expected> = [Sent] extends [Expected] ? true : false;
type Check<T extends true[]> = T;

export type ResponseChecks = Check<
  [
    Fits<Json<PublicWeddingData>, PublicWedding>,
    Fits<Json<PublicInvitationData>, PublicInvitation>,
    Fits<Json<PublicGuestbookEntryData>, PublicGuestbookEntry>,
    Fits<Json<PublicGalleryData>, PublicGallery>,
    Fits<Json<AdminGuestbookEntryData>, AdminGuestbookEntry>,
    Fits<Json<AdminAlbumData>, AdminAlbum>,
    Fits<Json<AdminPhotoData>, AdminPhoto>,
    Fits<Json<AdminInvitationData>, AdminInvitation>,
    Fits<Json<AdminEventData>, AdminEvent>,
    Fits<Json<AdminGiftData>, AdminGift>,
    Fits<Json<AdminExpenseData>, AdminExpense>,
    Fits<Json<AdminTaskData>, AdminTask>,
    Fits<Json<PlanSummaryData>, PlanSummary>,
  ]
>;
