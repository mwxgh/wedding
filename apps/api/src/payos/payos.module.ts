import { Module } from '@nestjs/common';

import {
  AdminPayosController,
  PayosWebhookController,
  PublicGiftsController,
} from './payos.controller';
import { PayosService } from './payos.service';

// online gifts: one payOS channel (bank account) per family
@Module({
  controllers: [
    PublicGiftsController,
    PayosWebhookController,
    AdminPayosController,
  ],
  providers: [PayosService],
  exports: [PayosService],
})
export class PayosModule {}
