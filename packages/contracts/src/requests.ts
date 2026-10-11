import type {
  GiftMethod,
  ModerationStatus,
  PlanCategory,
  Relation,
  RsvpStatus,
  Side,
} from './enums.js';

/** Request bodies. Dates are ISO strings. The API's DTO classes implement these. */

export interface OkResponse {
  ok: true;
  pending?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  email: string;
}

export interface RsvpItemInput {
  eventId: string;
  status: RsvpStatus;
  attendingCount: number;
  message?: string;
}

export interface RsvpRequest {
  responses: RsvpItemInput[];
}

export interface GuestbookRequest {
  authorName: string;
  message: string;
  invitationCode?: string;
}

export interface WeddingInfoInput {
  brideName: string;
  groomName: string;
  brideParents?: string;
  groomParents?: string;
  /** Only needed the first time; afterwards the day is set via `ScheduleInput`. */
  weddingDate?: string;
  story?: string;
  coverPhotoKey?: string;
}

/** Event time relative to the wedding day (see `schedule.ts`). */
export interface EventTimingInput {
  dayOffset: number;
  startTime: string;
  endTime?: string | null;
}

export interface EventInput extends EventTimingInput {
  name: string;
  side: Side;
  venueName: string;
  address: string;
  mapUrl?: string;
  sortOrder?: number;
}

/** Where an event happens. `mapUrl` is optional: the address is enough. */
export interface EventVenueInput {
  venueName: string;
  address: string;
  mapUrl?: string | null;
}

/** The wedding day plus every event's time and venue, saved together. */
export interface ScheduleInput {
  /** `YYYY-MM-DD`, Vietnam calendar day. */
  weddingDate: string;
  events: (EventTimingInput & Partial<EventVenueInput> & { id: string })[];
}

export interface TableInput {
  name: string;
  capacity?: number;
}

export interface GuestInput {
  name: string;
  isChild?: boolean;
  dietaryNote?: string;
}

export interface InvitationInput {
  name: string;
  side: Side;
  relation?: Relation;
  maxGuests?: number;
  phone?: string;
  note?: string;
  guests?: GuestInput[];
  eventIds?: string[];
}

export interface InvitationEventInput {
  status?: RsvpStatus;
  attendingCount?: number;
  tableId?: string | null;
}

export interface ModerationInput {
  status: ModerationStatus;
}

export interface AlbumInput {
  title: string;
  isGuest?: boolean;
  sortOrder?: number;
}

export interface UpdatePhotoInput {
  status?: ModerationStatus;
  albumId?: string | null;
  caption?: string;
}

export interface GiftInput {
  giverName: string;
  method: GiftMethod;
  amount?: number;
  description?: string;
  invitationId?: string;
  eventId?: string;
  receivedAt?: string;
}

export interface BankAccountInput {
  side: Side;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  sortOrder?: number;
}

// ---------- planning ----------

export interface BudgetInput {
  /** Total budget in VND; null clears it. */
  budget: number | null;
}

export interface ExpenseInput {
  category: PlanCategory;
  name: string;
  vendor?: string;
  /** Expected cost, VND. */
  estimated?: number;
  side?: Side;
  dueDate?: string | null;
  note?: string;
}

export interface PaymentInput {
  amount: number;
  paidAt?: string;
  note?: string;
}

export interface TaskInput {
  title: string;
  category?: PlanCategory;
  dueDate?: string | null;
  assignee?: Side | null;
  note?: string;
  expenseId?: string | null;
  /** Mark done (sets doneAt) or not done (clears it). */
  done?: boolean;
}
