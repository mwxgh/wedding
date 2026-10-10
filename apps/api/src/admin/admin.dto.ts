import { PartialType } from '@nestjs/mapped-types';

import type {
  AlbumInput,
  BankAccountInput,
  EventInput,
  GiftInput,
  GuestInput,
  InvitationEventInput,
  InvitationInput,
  ModerationInput,
  TableInput,
  UpdatePhotoInput,
  WeddingInfoInput,
} from '@repo/contracts';
import {
  GiftMethod,
  ModerationStatus,
  Relation,
  RsvpStatus,
  Side,
} from '@repo/db';
import {
  BooleanField,
  ClassField,
  DateStringField,
  EnumField,
  IntField,
  PhoneField,
  StringField,
  UrlField,
  UuidField,
} from '@repo/validation';

// Each DTO implements its type from @repo/contracts, so the API and the web
// stay in sync with one shared definition.

export class WeddingInfoDto implements WeddingInfoInput {
  @StringField({ minLength: 1, maxLength: 100 }) brideName: string;
  @StringField({ minLength: 1, maxLength: 100 }) groomName: string;
  @StringField({ optional: true, maxLength: 255 }) brideParents?: string;
  @StringField({ optional: true, maxLength: 255 }) groomParents?: string;
  @DateStringField() weddingDate: string;
  @StringField({ optional: true }) story?: string;
  @StringField({ optional: true }) coverPhotoKey?: string;
}

export class EventDto implements EventInput {
  @StringField({ minLength: 1, maxLength: 191 }) name: string;
  @EnumField(Side) side: Side;
  @DateStringField() startAt: string;
  @DateStringField({ optional: true }) endAt?: string;
  @StringField({ minLength: 1, maxLength: 191 }) venueName: string;
  @StringField({ minLength: 1, maxLength: 191 }) address: string;
  @UrlField({ optional: true }) mapUrl?: string;
  @IntField({ optional: true }) sortOrder?: number;
}
export class UpdateEventDto extends PartialType(EventDto) {}

export class TableDto implements TableInput {
  @StringField({ minLength: 1, maxLength: 100 }) name: string;
  @IntField({ optional: true, min: 1 }) capacity?: number;
}
export class UpdateTableDto extends PartialType(TableDto) {}

export class GuestDto implements GuestInput {
  @StringField({ minLength: 1, maxLength: 100 }) name: string;
  @BooleanField({ optional: true }) isChild?: boolean;
  @StringField({ optional: true, maxLength: 191 }) dietaryNote?: string;
}

export class InvitationDto implements InvitationInput {
  @StringField({ minLength: 1, maxLength: 191 }) name: string;
  @EnumField(Side) side: Side;
  @EnumField(Relation, { optional: true }) relation?: Relation;
  @IntField({ optional: true, min: 1, max: 50 }) maxGuests?: number;
  @PhoneField({ optional: true }) phone?: string;
  @StringField({ optional: true }) note?: string;
  @ClassField(() => GuestDto, { optional: true, each: true })
  guests?: GuestDto[];
  @UuidField({ version: '7', optional: true, each: true, uniqueItems: true })
  eventIds?: string[];
}
export class UpdateInvitationDto extends PartialType(InvitationDto) {}

export class InvitationEventDto implements InvitationEventInput {
  @EnumField(RsvpStatus, { optional: true }) status?: RsvpStatus;
  @IntField({ optional: true, min: 0 }) attendingCount?: number;
  // `null` clears the seat
  @UuidField({ version: '7', optional: true, nullable: true }) tableId?:
    string | null;
}

export class ModerationDto implements ModerationInput {
  @EnumField(ModerationStatus) status: ModerationStatus;
}

export class AlbumDto implements AlbumInput {
  @StringField({ minLength: 1, maxLength: 191 }) title: string;
  @BooleanField({ optional: true }) isGuest?: boolean;
  @IntField({ optional: true }) sortOrder?: number;
}

export class PhotoUploadDto {
  @UuidField({ version: '7', optional: true }) albumId?: string;
  @StringField({ optional: true, maxLength: 255 }) caption?: string;
}

export class UpdatePhotoDto implements UpdatePhotoInput {
  @EnumField(ModerationStatus, { optional: true }) status?: ModerationStatus;
  @UuidField({ version: '7', optional: true, nullable: true }) albumId?:
    string | null;
  @StringField({ optional: true, maxLength: 255 }) caption?: string;
}

export class GiftDto implements GiftInput {
  @StringField({ minLength: 1, maxLength: 191 }) giverName: string;
  @EnumField(GiftMethod) method: GiftMethod;
  @IntField({ optional: true, min: 0 }) amount?: number;
  @StringField({ optional: true, maxLength: 191 }) description?: string;
  @UuidField({ version: '7', optional: true }) invitationId?: string;
  @UuidField({ version: '7', optional: true }) eventId?: string;
  @DateStringField({ optional: true }) receivedAt?: string;
}
export class UpdateGiftDto extends PartialType(GiftDto) {}

export class BankAccountDto implements BankAccountInput {
  @EnumField(Side) side: Side;
  @StringField({ pattern: /^\d{6,8}$/ }) bankBin: string;
  @StringField({ pattern: /^\d{4,30}$/ }) accountNumber: string;
  @StringField({ minLength: 1, maxLength: 100, toUpperCase: true })
  accountName: string;
  @IntField({ optional: true }) sortOrder?: number;
}
export class UpdateBankAccountDto extends PartialType(BankAccountDto) {}
