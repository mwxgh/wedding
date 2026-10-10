import type {
  GiftMethod,
  ModerationStatus,
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
  weddingDate: string;
  story?: string;
  coverPhotoKey?: string;
}

export interface EventInput {
  name: string;
  side: Side;
  startAt: string;
  endAt?: string;
  venueName: string;
  address: string;
  mapUrl?: string;
  sortOrder?: number;
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
