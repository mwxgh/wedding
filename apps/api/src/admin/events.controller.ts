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
  type AdminEventData,
  type OkResponse,
  adminEventInclude,
} from '@repo/contracts';
import type { Event, Table } from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventDto,
  TableDto,
  UpdateEventDto,
  UpdateTableDto,
} from './admin.dto';
import { eventTimingData, weddingDay } from './schedule';

const splitTiming = <T extends Partial<EventDto>>({
  dayOffset,
  startTime,
  endTime,
  ...rest
}: T) => ({ timing: { dayOffset, startTime, endTime }, rest });

@Controller('admin')
@UseGuards(AdminGuard)
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('events')
  list(): Promise<AdminEventData[]> {
    return this.prisma.event.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
      include: adminEventInclude,
    });
  }

  @Post('events')
  create(@Body() dto: EventDto): Promise<Event> {
    const { rest } = splitTiming(dto);
    return this.prisma.$transaction(async (tx) =>
      tx.event.create({
        data: { ...rest, ...eventTimingData(await weddingDay(tx), dto) },
      }),
    );
  }

  /** Time fields are relative to the wedding day; timestamps are derived. */
  @Patch('events/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto): Promise<Event> {
    const { timing, rest } = splitTiming(dto);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.event.findUniqueOrThrow({
        where: { id },
        select: { dayOffset: true, startTime: true, endTime: true },
      });
      const merged = {
        dayOffset: timing.dayOffset ?? current.dayOffset,
        startTime: timing.startTime ?? current.startTime,
        endTime:
          timing.endTime === undefined ? current.endTime : timing.endTime,
      };
      return tx.event.update({
        where: { id },
        data: { ...rest, ...eventTimingData(await weddingDay(tx), merged) },
      });
    });
  }

  @Delete('events/:id')
  async remove(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }

  @Post('events/:id/tables')
  createTable(
    @Param('id') eventId: string,
    @Body() dto: TableDto,
  ): Promise<Table> {
    return this.prisma.table.create({ data: { ...dto, eventId } });
  }

  @Patch('tables/:id')
  updateTable(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ): Promise<Table> {
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  @Delete('tables/:id')
  async removeTable(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.table.delete({ where: { id } });
    return { ok: true };
  }
}
