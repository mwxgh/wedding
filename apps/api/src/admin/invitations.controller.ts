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
  type AdminInvitationData,
  type OkResponse,
  adminInvitationInclude as include,
} from '@repo/contracts';
import type { InvitationEvent } from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { generateInvitationCode } from '../common/invitation-code';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvitationDto,
  InvitationEventDto,
  UpdateInvitationDto,
} from './admin.dto';

@Controller('admin/invitations')
@UseGuards(AdminGuard)
export class InvitationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(): Promise<AdminInvitationData[]> {
    return this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      include,
    });
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<AdminInvitationData> {
    return this.prisma.invitation.findUniqueOrThrow({
      where: { id },
      include,
    });
  }

  @Post()
  create(@Body() dto: InvitationDto): Promise<AdminInvitationData> {
    const { guests = [], eventIds = [], ...data } = dto;
    return this.prisma.invitation.create({
      data: {
        ...data,
        code: generateInvitationCode(),
        guests: { create: guests },
        events: { create: eventIds.map((eventId) => ({ eventId })) },
      },
      include,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvitationDto,
  ): Promise<AdminInvitationData> {
    const { guests, eventIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (guests) {
        await tx.guest.deleteMany({ where: { invitationId: id } });
        await tx.guest.createMany({
          data: guests.map((g) => ({ ...g, invitationId: id })),
        });
      }
      if (eventIds) {
        // createMany + skipDuplicates becomes INSERT IGNORE on MySQL, which would silently drop bad ids
        if (
          (await tx.event.count({ where: { id: { in: eventIds } } })) !==
          new Set(eventIds).size
        ) {
          throw new BadRequestException('Sự kiện không hợp lệ');
        }
        // Keep existing RSVP rows for events still invited
        await tx.invitationEvent.deleteMany({
          where: { invitationId: id, eventId: { notIn: eventIds } },
        });
        await tx.invitationEvent.createMany({
          data: eventIds.map((eventId) => ({ invitationId: id, eventId })),
          skipDuplicates: true,
        });
      }
      return tx.invitation.update({ where: { id }, data, include });
    });
  }

  @Patch(':id/events/:eventId')
  updateEvent(
    @Param('id') invitationId: string,
    @Param('eventId') eventId: string,
    @Body() dto: InvitationEventDto,
  ): Promise<InvitationEvent> {
    return this.prisma.invitationEvent.update({
      where: { invitationId_eventId: { invitationId, eventId } },
      data: dto,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.invitation.delete({ where: { id } });
    return { ok: true };
  }
}
