import type {
  GuestbookRequest,
  RsvpItemInput,
  RsvpRequest,
} from '@repo/contracts';
import { RsvpStatus } from '@repo/db';
import {
  ClassField,
  EnumField,
  IntField,
  StringField,
  UuidField,
} from '@repo/validation';

export class RsvpItemDto implements RsvpItemInput {
  @UuidField({ version: '7' }) eventId: string;
  @EnumField(RsvpStatus) status: RsvpStatus;
  @IntField({ min: 0 }) attendingCount: number;
  @StringField({ optional: true, maxLength: 1000 }) message?: string;
}

export class RsvpDto implements RsvpRequest {
  @ClassField(() => RsvpItemDto, { each: true, minItems: 1 })
  responses: RsvpItemDto[];
}

export class GuestbookDto implements GuestbookRequest {
  @StringField({ minLength: 1, maxLength: 100 }) authorName: string;
  @StringField({ minLength: 1, maxLength: 2000 }) message: string;
  @StringField({ optional: true }) invitationCode?: string;
}

export class GuestPhotoDto {
  @StringField({ minLength: 1 }) invitationCode: string;
  @StringField({ optional: true, maxLength: 255 }) caption?: string;
}
