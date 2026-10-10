import {
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
import type { BankAccount, Gift } from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankAccountDto,
  GiftDto,
  UpdateBankAccountDto,
  UpdateGiftDto,
} from './admin.dto';

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
  updateGift(
    @Param('id') id: string,
    @Body() dto: UpdateGiftDto,
  ): Promise<Gift> {
    return this.prisma.gift.update({ where: { id }, data: toGiftData(dto) });
  }

  @Delete('gifts/:id')
  async removeGift(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.gift.delete({ where: { id } });
    return { ok: true };
  }

  @Get('bank-accounts')
  bankAccounts(): Promise<BankAccount[]> {
    return this.prisma.bankAccount.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Post('bank-accounts')
  createBankAccount(@Body() dto: BankAccountDto): Promise<BankAccount> {
    return this.prisma.bankAccount.create({ data: dto });
  }

  @Patch('bank-accounts/:id')
  updateBankAccount(
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccount> {
    return this.prisma.bankAccount.update({ where: { id }, data: dto });
  }

  @Delete('bank-accounts/:id')
  async removeBankAccount(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.bankAccount.delete({ where: { id } });
    return { ok: true };
  }
}
