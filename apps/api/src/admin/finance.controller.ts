import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  type AdminGiftData,
  type OkResponse,
  adminGiftInclude,
} from '@repo/contracts';
import { type Gift, GiftSource } from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GiftDto, UpdateGiftDto } from './admin.dto';

const toGiftData = <T extends Partial<GiftDto>>(dto: T) => ({
  ...dto,
  amount: dto.amount === undefined ? undefined : BigInt(dto.amount),
  receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
});

@Controller('admin')
@UseGuards(AdminGuard)
export class FinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('gifts')
  gifts(): Promise<AdminGiftData[]> {
    return this.prisma.gift.findMany({
      orderBy: { receivedAt: 'desc' },
      include: adminGiftInclude,
    });
  }

  @Post('gifts')
  createGift(@Body() dto: GiftDto): Promise<Gift> {
    return this.prisma.gift.create({ data: toGiftData(dto) });
  }

  @Patch('gifts/:id')
  async updateGift(
    @Param('id') id: string,
    @Body() dto: UpdateGiftDto,
  ): Promise<Gift> {
    const gift = await this.prisma.gift.findUniqueOrThrow({ where: { id } });
    // the bank confirmed these: keep what was received as it was received
    if (
      gift.source === GiftSource.PAYOS &&
      (dto.amount !== undefined ||
        dto.method !== undefined ||
        dto.side !== undefined ||
        dto.receivedAt !== undefined)
    )
      throw new BadRequestException(
        'Khoản mừng từ payOS chỉ sửa được tên, ghi chú, thiệp và sự kiện',
      );
    return this.prisma.gift.update({ where: { id }, data: toGiftData(dto) });
  }

  @Delete('gifts/:id')
  async removeGift(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.gift.delete({ where: { id } });
    return { ok: true };
  }
}
