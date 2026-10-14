import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import type { Webhook } from '@payos/node';

import type {
  PayosChannel,
  PayosSyncResult,
  PublicGiftPaymentData,
  PublicGiftStatus,
} from '@repo/contracts';

import { AdminGuard } from '../auth/auth.guard';
import { GiftPaymentDto, PayosConfigDto, PayosWebhookDto } from './payos.dto';
import { PayosService } from './payos.service';

/** Guests: open a gift QR, then poll until the money arrives. */
@Controller('public/gifts')
export class PublicGiftsController {
  constructor(private readonly payos: PayosService) {}

  @Post()
  create(
    @Body() dto: GiftPaymentDto,
    @Ip() ip: string,
  ): Promise<PublicGiftPaymentData> {
    return this.payos.createGift(dto, ip);
  }

  @Get(':id')
  status(@Param('id') id: string): Promise<PublicGiftStatus> {
    return this.payos.status(id);
  }
}

/** payOS calls this after a transfer; the body is checked by its signature. */
@Controller('payos')
export class PayosWebhookController {
  constructor(private readonly payos: PayosService) {}

  @Post('webhook/:side')
  @HttpCode(200)
  webhook(@Param('side') side: string, @Body() body: Webhook) {
    return this.payos.handleWebhook(side, body);
  }
}

@Controller('admin/payos')
@UseGuards(AdminGuard)
export class AdminPayosController {
  constructor(private readonly payos: PayosService) {}

  @Get('channels')
  channels(): Promise<PayosChannel[]> {
    return this.payos.channels();
  }

  @Put(':side')
  save(@Param('side') side: string, @Body() dto: PayosConfigDto) {
    return this.payos.saveConfig(side, dto);
  }

  @Delete(':side')
  remove(@Param('side') side: string) {
    return this.payos.removeConfig(side);
  }

  @Post('sync')
  @HttpCode(200)
  sync(): Promise<PayosSyncResult> {
    return this.payos.sync();
  }

  /** Registers the webhook URL with payOS (payOS pings it to confirm). */
  @Post(':side/webhook')
  @HttpCode(200)
  confirm(@Param('side') side: string, @Body() dto: PayosWebhookDto) {
    return this.payos.confirmWebhook(side, dto.url);
  }
}
