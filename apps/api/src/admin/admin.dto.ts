import { PartialType } from '@nestjs/mapped-types';

import type {
  AlbumInput,
  BankAccountInput,
  BudgetInput,
  EventInput,
  ExpenseInput,
  GiftInput,
  GuestInput,
  InvitationEventInput,
  InvitationInput,
  ModerationInput,
  PaymentInput,
  ScheduleInput,
  TableInput,
  TaskInput,
  UpdatePhotoInput,
  WeddingInfoInput,
} from '@repo/contracts';
import { DAY_PATTERN, TIME_PATTERN } from '@repo/contracts';
import {
  GiftMethod,
  ModerationStatus,
  PlanCategory,
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
  /** First save only; the day is changed through `ScheduleDto`. */
  @DateStringField({ optional: true }) weddingDate?: string;
  @StringField({ optional: true }) story?: string;
  @StringField({ optional: true }) coverPhotoKey?: string;
}

const TIME = { pattern: TIME_PATTERN };

class EventTimingDto {
  @IntField({ min: -365, max: 365 }) dayOffset: number;
  @StringField(TIME) startTime: string;
  @StringField({ ...TIME, optional: true, nullable: true })
  endTime?: string | null;
}

export class EventDto extends EventTimingDto implements EventInput {
  @StringField({ minLength: 1, maxLength: 191 }) name: string;
  @EnumField(Side) side: Side;
  @StringField({ minLength: 1, maxLength: 191 }) venueName: string;
  @StringField({ minLength: 1, maxLength: 191 }) address: string;
  @UrlField({ optional: true }) mapUrl?: string;
  @IntField({ optional: true }) sortOrder?: number;
}
export class UpdateEventDto extends PartialType(EventDto) {}

class ScheduleEventDto extends EventTimingDto {
  @UuidField() id: string;
  @StringField({ optional: true, minLength: 1, maxLength: 191 })
  venueName?: string;
  @StringField({ optional: true, minLength: 1, maxLength: 191 })
  address?: string;
  @UrlField({ optional: true, nullable: true }) mapUrl?: string | null;
}

export class ScheduleDto implements ScheduleInput {
  @StringField({ pattern: DAY_PATTERN })
  weddingDate: string;
  @ClassField(() => ScheduleEventDto, { each: true })
  events: ScheduleEventDto[];
}

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

// ---------- planning ----------

export class BudgetDto implements BudgetInput {
  @IntField({ min: 0, nullable: true }) budget: number | null;
}

export class ExpenseDto implements ExpenseInput {
  @EnumField(PlanCategory) category: PlanCategory;
  @StringField({ minLength: 1, maxLength: 191 }) name: string;
  @StringField({ optional: true, maxLength: 191 }) vendor?: string;
  @IntField({ optional: true, min: 0 }) estimated?: number;
  @EnumField(Side, { optional: true }) side?: Side;
  @DateStringField({ optional: true, nullable: true }) dueDate?: string | null;
  @StringField({ optional: true }) note?: string;
}
export class UpdateExpenseDto extends PartialType(ExpenseDto) {}

export class PaymentDto implements PaymentInput {
  @IntField({ min: 1 }) amount: number;
  @DateStringField({ optional: true }) paidAt?: string;
  @StringField({ optional: true, maxLength: 191 }) note?: string;
}

export class TaskDto implements TaskInput {
  @StringField({ minLength: 1, maxLength: 191 }) title: string;
  @EnumField(PlanCategory, { optional: true }) category?: PlanCategory;
  @DateStringField({ optional: true, nullable: true }) dueDate?: string | null;
  @EnumField(Side, { optional: true, nullable: true }) assignee?: Side | null;
  @StringField({ optional: true }) note?: string;
  @UuidField({ version: '7', optional: true, nullable: true })
  expenseId?: string | null;
  @BooleanField({ optional: true }) done?: boolean;
}
export class UpdateTaskDto extends PartialType(TaskDto) {}
