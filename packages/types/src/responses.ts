import type {
  GiftMethod,
  GiftSource,
  PayosStatus,
  PlanCategory,
  Relation,
  RsvpStatus,
  Side,
} from './generated/enums.js';
import type {
  Album,
  Event,
  Expense,
  ExpensePayment,
  Gift,
  Guest,
  GuestbookEntry,
  Invitation,
  InvitationEvent,
  PayosPayment,
  Photo,
  Table,
  Task,
  WeddingInfo,
} from './generated/models.js';
import type { Json, With } from './helpers.js';

/**
 * Response bodies as the web receives them (after JSON serialization).
 * Model shapes come from `./generated` (`pnpm db:types`); here we only say
 * which relations each endpoint includes.
 *
 * `*Data` types carry `Date`/`bigint` so the API can return them as-is;
 * the unsuffixed type is `Json<*Data>`.
 */

// ---------- Public ----------

export interface PublicWedding {
  info: WeddingInfo | null;
  events: Event[];
  /** Families that can receive an online gift (payOS configured). */
  giftChannels: Side[];
}

export type PublicEvent = Event & {
  rsvp: {
    status: RsvpStatus;
    attendingCount: number;
    message: string | null;
    respondedAt: string | null;
  };
  table: string | null;
};

export interface PublicInvitation {
  code: string;
  name: string;
  side: Side;
  maxGuests: number;
  guests: { name: string; isChild: boolean }[];
  events: PublicEvent[];
}

export type PublicGuestbookEntry = Pick<
  GuestbookEntry,
  'id' | 'authorName' | 'message' | 'createdAt'
>;

export interface PublicPhoto {
  id: string;
  albumId: string | null;
  caption: string | null;
  url: string;
}

export interface PublicGallery {
  albums: Album[];
  photos: PublicPhoto[];
}

// ---------- Admin ----------

export type WeddingInfoJson = WeddingInfo;
export type EventJson = Event;

export type AdminGuestbookEntry = With<
  GuestbookEntry,
  { invitation: Pick<Invitation, 'name' | 'code'> | null }
>;

export type AdminAlbum = With<Album, { _count: { photos: number } }>;

export type AdminPhoto = With<
  Photo,
  {
    invitation: Pick<Invitation, 'name'> | null;
    album: Pick<Album, 'title'> | null;
    url: string;
  }
>;

export type AdminInvitation = With<
  Invitation,
  {
    guests: Guest[];
    events: With<
      InvitationEvent,
      { event: Pick<Event, 'id' | 'name'>; table: Table | null }
    >[];
  }
>;

export type AdminEvent = With<
  Event,
  {
    tables: With<
      Table,
      {
        seats: With<
          InvitationEvent,
          { invitation: Pick<Invitation, 'id' | 'name'> }
        >[];
      }
    >[];
  }
>;

export type AdminGift = With<
  Gift,
  {
    invitation: Pick<Invitation, 'id' | 'name'> | null;
    event: Pick<Event, 'id' | 'name'> | null;
    payment: Pick<
      PayosPayment,
      'orderCode' | 'reference' | 'counterAccountName' | 'paidAt'
    > | null;
  }
>;

// ---------- online gifts (payOS) ----------

/** What the guest needs to pay: the QR and the account behind it. */
export interface PublicGiftPaymentData {
  id: string;
  side: Side;
  amount: number;
  status: PayosStatus;
  /** VietQR payload to render as a QR image */
  qrCode: string;
  checkoutUrl: string;
  bin: string;
  accountNumber: string;
  accountName: string;
  description: string;
  expiresAt: Date;
}
export type PublicGiftPayment = Json<PublicGiftPaymentData>;

export interface PublicGiftStatus {
  status: PayosStatus;
}

/** A family's payOS channel as the admin sees it; keys only as hints. */
export interface PayosChannel {
  side: Side;
  configured: boolean;
  enabled: boolean;
  clientId: string | null;
  /** e.g. `••••abcd` */
  apiKeyHint: string | null;
  checksumKeyHint: string | null;
  updatedAt: string | null;
  /** Where payOS should send payment webhooks for this channel */
  webhookPath: string;
}

export interface PayosSyncResult {
  checked: number;
  paid: number;
}

// ---------- dashboard ----------

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
    bySource: { source: GiftSource; count: number; amount: bigint }[];
    bySide: { side: Side | null; count: number; amount: bigint }[];
  };
}
export type Dashboard = Json<DashboardData>;

// ---------- planning ----------

export type AdminExpense = With<
  Expense,
  { payments: ExpensePayment[]; _count: { tasks: number } }
>;

export type AdminTask = With<
  Task,
  { expense: Pick<Expense, 'id' | 'name'> | null }
>;

/** `TaskT` is the API's Prisma task row; the web gets `AdminTask`. */
export interface PlanSummaryData<TaskT = AdminTask> {
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
  upcoming: TaskT[];
}
export type PlanSummary = Json<PlanSummaryData>;
