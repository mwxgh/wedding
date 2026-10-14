import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PayOS, type Webhook } from '@payos/node';

import type {
  PayosChannel,
  PayosSyncResult,
  PublicGiftPaymentData,
} from '@repo/contracts';
import {
  GiftMethod,
  GiftSource,
  type PayosPayment,
  PayosStatus,
  Side,
} from '@repo/db';

import { hint, open, seal } from '../common/secret-box';
import { config } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import type { GiftPaymentDto, PayosConfigDto } from './payos.dto';

export const PAYOS_SIDES = [Side.GROOM, Side.BRIDE] as const;
export type PayosSide = (typeof PAYOS_SIDES)[number];

const isPayosSide = (side: string): side is PayosSide =>
  (PAYOS_SIDES as readonly string[]).includes(side);

/** Poll payOS for one payment at most this often. */
const CHECK_EVERY_MS = 4_000;
/** Guests can open at most this many QR codes per window, per IP. */
const RATE = { max: 8, windowMs: 10 * 60_000 };

interface Paid {
  amount: number;
  reference: string | null;
  counterAccountName: string | null;
  paidAt: Date;
}

/** payOS sends `YYYY-MM-DD HH:mm:ss` in Vietnam time. */
const parsePaidAt = (value: string | undefined) => {
  const date = value ? new Date(`${value.replace(' ', 'T')}+07:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : new Date();
};

/** Time-based and unique enough; payOS needs a positive integer. */
const newOrderCode = () =>
  (Date.now() % 1e12) * 100 + Math.floor(Math.random() * 100);

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private readonly clients = new Map<
    PayosSide,
    { client: PayOS; version: number }
  >();
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  /** Families that accept online gifts right now. */
  async enabledSides(): Promise<PayosSide[]> {
    const rows = await this.prisma.payosConfig.findMany({
      where: { enabled: true, side: { in: [...PAYOS_SIDES] } },
      select: { side: true },
    });
    return PAYOS_SIDES.filter((s) => rows.some((r) => r.side === s));
  }

  async channels(): Promise<PayosChannel[]> {
    const rows = await this.prisma.payosConfig.findMany();
    return PAYOS_SIDES.map((side) => {
      const row = rows.find((r) => r.side === side);
      const keyHint = (sealed: string) => {
        try {
          return hint(open(sealed));
        } catch {
          // SETTINGS_SECRET changed: the key must be entered again
          return null;
        }
      };
      return {
        side,
        configured: !!row,
        enabled: row?.enabled ?? false,
        clientId: row?.clientId ?? null,
        apiKeyHint: row ? keyHint(row.apiKeyEnc) : null,
        checksumKeyHint: row ? keyHint(row.checksumKeyEnc) : null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        webhookPath: `/payos/webhook/${side}`,
      };
    });
  }

  /** Creates or updates a channel; blank keys keep the stored ones. */
  async saveConfig(side: string, dto: PayosConfigDto) {
    if (!isPayosSide(side)) throw new BadRequestException('Kênh không hợp lệ');
    const current = await this.prisma.payosConfig.findUnique({
      where: { side },
    });
    if (!current && (!dto.apiKey || !dto.checksumKey))
      throw new BadRequestException('Cần nhập đủ API key và checksum key');
    const keys = {
      ...(dto.apiKey ? { apiKeyEnc: seal(dto.apiKey) } : {}),
      ...(dto.checksumKey ? { checksumKeyEnc: seal(dto.checksumKey) } : {}),
    };
    const fields = { clientId: dto.clientId, enabled: dto.enabled, ...keys };
    // not an upsert: Prisma validates `create` even when the row exists
    if (current)
      await this.prisma.payosConfig.update({ where: { side }, data: fields });
    else
      await this.prisma.payosConfig.create({
        data: {
          ...fields,
          side,
          apiKeyEnc: seal(dto.apiKey!),
          checksumKeyEnc: seal(dto.checksumKey!),
        },
      });
    this.clients.delete(side);
    return { ok: true as const };
  }

  async removeConfig(side: string) {
    if (!isPayosSide(side)) throw new BadRequestException('Kênh không hợp lệ');
    await this.prisma.payosConfig.deleteMany({ where: { side } });
    this.clients.delete(side);
    return { ok: true as const };
  }

  /**
   * payOS client for a family, built from the stored keys and rebuilt when
   * they change. Only new gifts need the channel switched on: links already
   * handed out must still settle after it is turned off.
   */
  private async client(side: string, { forNewGift = false } = {}) {
    if (!isPayosSide(side)) throw new BadRequestException('Kênh không hợp lệ');
    const row = await this.prisma.payosConfig.findUnique({ where: { side } });
    if (!row || (forNewGift && !row.enabled))
      throw new ServiceUnavailableException(
        'Mừng cưới online cho bên này chưa được bật',
      );
    const cached = this.clients.get(side);
    if (cached && cached.version === row.updatedAt.getTime())
      return cached.client;
    let keys: { apiKey: string; checksumKey: string };
    try {
      keys = {
        apiKey: open(row.apiKeyEnc),
        checksumKey: open(row.checksumKeyEnc),
      };
    } catch {
      this.logger.error(`payOS keys for ${side} cannot be decrypted`);
      throw new ServiceUnavailableException(
        'Không đọc được key payOS, hãy nhập lại trong Cài đặt',
      );
    }
    const client = new PayOS({
      clientId: row.clientId,
      ...keys,
      logLevel: 'warn',
    });
    this.clients.set(side, { client, version: row.updatedAt.getTime() });
    return client;
  }

  private rateLimit(ip: string) {
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter(
      (t) => now - t < RATE.windowMs,
    );
    if (recent.length >= RATE.max)
      throw new HttpException(
        'Bạn tạo mã hơi nhiều, thử lại sau ít phút nhé',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.hits.set(ip, [...recent, now]);
  }

  // ---------- guest flow ----------

  async createGift(
    dto: GiftPaymentDto,
    ip: string,
  ): Promise<PublicGiftPaymentData> {
    const client = await this.client(dto.side, { forNewGift: true });
    this.rateLimit(ip);

    const invitation = dto.invitationCode
      ? await this.prisma.invitation.findUnique({
          where: { code: dto.invitationCode },
          select: { id: true },
        })
      : null;

    const orderCode = newOrderCode();
    const expiresAt = new Date(Date.now() + config.payos.ttlMinutes * 60_000);
    // short: banks without payOS virtual accounts cap the transfer note
    const description = 'Mung cuoi';
    const link = await client.paymentRequests
      .create({
        orderCode,
        amount: dto.amount,
        description,
        buyerName: dto.giverName,
        returnUrl: `${config.payos.siteUrl}/?gift=paid`,
        cancelUrl: `${config.payos.siteUrl}/?gift=cancelled`,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
      })
      .catch((err: Error) => {
        this.logger.error(`payOS create failed: ${err.message}`);
        throw new ServiceUnavailableException(
          'Không tạo được mã QR lúc này, bạn thử lại sau nhé',
        );
      });

    const payment = await this.prisma.payosPayment.create({
      data: {
        orderCode: BigInt(orderCode),
        side: dto.side,
        amount: BigInt(dto.amount),
        giverName: dto.giverName,
        message: dto.message,
        invitationId: invitation?.id,
        paymentLinkId: link.paymentLinkId,
        qrCode: link.qrCode,
        checkoutUrl: link.checkoutUrl,
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
        description: link.description,
        expiresAt: link.expiredAt ? new Date(link.expiredAt * 1000) : expiresAt,
      },
    });
    return toPublic(payment);
  }

  /** Current status; asks payOS directly so it works without a webhook. */
  async status(id: string) {
    const payment = await this.prisma.payosPayment.findUnique({
      where: { id },
    });
    if (!payment) throw new NotFoundException();
    const fresh = await this.refresh(payment);
    return { status: fresh };
  }

  // ---------- reconciliation ----------

  private async refresh(payment: PayosPayment, force = false) {
    if (payment.status !== PayosStatus.PENDING) return payment.status;
    const checked = payment.checkedAt?.getTime() ?? 0;
    if (!force && Date.now() - checked < CHECK_EVERY_MS) return payment.status;

    await this.prisma.payosPayment.update({
      where: { id: payment.id },
      data: { checkedAt: new Date() },
    });
    try {
      const client = await this.client(payment.side);
      const link = await client.paymentRequests.get(Number(payment.orderCode));
      if (link.status === 'PAID') {
        const tx = link.transactions[0];
        await this.markPaid(payment, {
          amount: link.amountPaid || Number(payment.amount),
          reference: tx?.reference ?? null,
          counterAccountName: tx?.counterAccountName ?? null,
          paidAt: parsePaidAt(tx?.transactionDateTime),
        });
        return PayosStatus.PAID;
      }
      if (link.status === 'CANCELLED' || link.status === 'EXPIRED') {
        await this.prisma.payosPayment.updateMany({
          where: { id: payment.id, status: PayosStatus.PENDING },
          data: { status: link.status },
        });
        return link.status;
      }
    } catch (err) {
      this.logger.warn(
        `payOS status ${payment.orderCode} failed: ${(err as Error).message}`,
      );
    }
    return payment.status;
  }

  /**
   * Turns a payment into a Gift exactly once, whichever of webhook, guest
   * polling or admin sync gets there first.
   */
  private async markPaid(payment: PayosPayment, paid: Paid) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payosPayment.updateMany({
        where: { id: payment.id, status: { not: PayosStatus.PAID } },
        data: {
          status: PayosStatus.PAID,
          paidAt: paid.paidAt,
          reference: paid.reference,
          counterAccountName: paid.counterAccountName,
        },
      });
      if (!claimed.count) return false;
      const gift = await tx.gift.create({
        data: {
          giverName: payment.giverName,
          method: GiftMethod.BANK_TRANSFER,
          source: GiftSource.PAYOS,
          side: payment.side,
          amount: BigInt(paid.amount),
          message: payment.message,
          invitationId: payment.invitationId,
          receivedAt: paid.paidAt,
          description: paid.counterAccountName
            ? `Từ TK ${paid.counterAccountName}`
            : null,
        },
      });
      await tx.payosPayment.update({
        where: { id: payment.id },
        data: { giftId: gift.id },
      });
      this.logger.log(`gift ${payment.orderCode} paid: ${paid.amount}`);
      return true;
    });
  }

  async handleWebhook(side: string, body: Webhook) {
    const client = await this.client(side);
    const data = await client.webhooks.verify(body).catch(() => {
      throw new BadRequestException('Invalid signature');
    });
    const payment = await this.prisma.payosPayment.findUnique({
      where: { orderCode: BigInt(data.orderCode) },
    });
    // payOS sends a sample order when the webhook URL is confirmed
    if (!payment || payment.side !== side) return { ok: true };
    if (body.success && data.code === '00')
      await this.markPaid(payment, {
        amount: data.amount,
        reference: data.reference || null,
        counterAccountName: data.counterAccountName ?? null,
        paidAt: parsePaidAt(data.transactionDateTime),
      });
    return { ok: true };
  }

  /** Re-checks recent unpaid links, e.g. when the webhook was unreachable. */
  async sync(): Promise<PayosSyncResult> {
    const pending = await this.prisma.payosPayment.findMany({
      where: {
        status: PayosStatus.PENDING,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3_600_000) },
      },
    });
    let paid = 0;
    for (const p of pending) {
      if ((await this.refresh(p, true)) === PayosStatus.PAID) paid++;
    }
    return { checked: pending.length, paid };
  }

  async confirmWebhook(side: string, url: string) {
    const client = await this.client(side);
    return client.webhooks.confirm(url).catch((err: Error) => {
      throw new BadRequestException(
        `payOS không xác nhận được webhook: ${err.message}`,
      );
    });
  }
}

const toPublic = (p: PayosPayment): PublicGiftPaymentData => ({
  id: p.id,
  side: p.side,
  amount: Number(p.amount),
  status: p.status,
  qrCode: p.qrCode,
  checkoutUrl: p.checkoutUrl,
  bin: p.bin,
  accountNumber: p.accountNumber,
  accountName: p.accountName,
  description: p.description,
  expiresAt: p.expiresAt,
});
