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

const toEventData = <T extends Partial<EventDto>>(dto: T) => ({
  ...dto,
  startAt: dto.startAt ? new Date(dto.startAt) : undefined,
  endAt: dto.endAt ? new Date(dto.endAt) : undefined,
});

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
    const data = toEventData(dto);
    return this.prisma.event.create({
      data: { ...data, startAt: new Date(dto.startAt) },
    });
  }

  @Patch('events/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto): Promise<Event> {
    return this.prisma.event.update({ where: { id }, data: toEventData(dto) });
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
