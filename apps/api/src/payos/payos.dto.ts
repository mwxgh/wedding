import type {
  GiftPaymentInput,
  PayosConfigInput,
  PayosWebhookInput,
} from '@repo/contracts';
import { Side } from '@repo/db';
import {
  BooleanField,
  EnumField,
  IntField,
  StringField,
  UrlField,
} from '@repo/validation';

export class GiftPaymentDto implements GiftPaymentInput {
  @EnumField(Side) side: Side;
  @IntField({ min: 10_000, max: 500_000_000 }) amount: number;
  @StringField({ minLength: 1, maxLength: 100 }) giverName: string;
  @StringField({ optional: true, maxLength: 500 }) message?: string;
  @StringField({ optional: true, maxLength: 16 }) invitationCode?: string;
}

export class PayosWebhookDto implements PayosWebhookInput {
  @UrlField() url: string;
}

export class PayosConfigDto implements PayosConfigInput {
  @StringField({ minLength: 1, maxLength: 191 }) clientId: string;
  @StringField({ optional: true, maxLength: 500 }) apiKey?: string;
  @StringField({ optional: true, maxLength: 500 }) checksumKey?: string;
  @BooleanField() enabled: boolean;
}
