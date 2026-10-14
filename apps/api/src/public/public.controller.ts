import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  type OkResponse,
  type PublicGalleryData,
  type PublicGuestbookEntryData,
  type PublicInvitationData,
  type PublicWeddingData,
  publicGuestbookSelect,
} from '@repo/contracts';
import { ModerationStatus, RsvpStatus } from '@repo/db';

import { config } from '../config';
import { PayosService } from '../payos/payos.service';
import { PhotoService } from '../photos/photo.service';
import { PrismaService } from '../prisma/prisma.service';
import { GuestPhotoDto, GuestbookDto, RsvpDto } from './public.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotoService,
    private readonly payos: PayosService,
  ) {}

  @Get('wedding')
  async wedding(): Promise<PublicWeddingData> {
    const [info, events] = await Promise.all([
      this.prisma.weddingInfo.findUnique({ where: { id: 1 } }),
      this.prisma.event.findMany({
        orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
      }),
    ]);
    return { info, events, giftChannels: await this.payos.enabledSides() };
  }

  @Get('invitations/:code')
  async invitation(@Param('code') code: string): Promise<PublicInvitationData> {
    const invitation = await this.findInvitation(code);
    if (!invitation.openedAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { openedAt: new Date() },
      });
    }
    return {
      code: invitation.code,
      name: invitation.name,
      side: invitation.side,
      maxGuests: invitation.maxGuests,
      guests: invitation.guests.map((g) => ({
        name: g.name,
        isChild: g.isChild,
      })),
      events: invitation.events.map((ie) => ({
        ...ie.event,
        rsvp: {
          status: ie.status,
          attendingCount: ie.attendingCount,
          message: ie.message,
          respondedAt: ie.respondedAt,
        },
        table: ie.table?.name ?? null,
      })),
    };
  }

  @Post('invitations/:code/rsvp')
  async rsvp(
    @Param('code') code: string,
    @Body() dto: RsvpDto,
  ): Promise<OkResponse> {
    const invitation = await this.findInvitation(code);
    const invitedEventIds = new Set(invitation.events.map((e) => e.eventId));

    for (const r of dto.responses) {
      if (!invitedEventIds.has(r.eventId))
        throw new BadRequestException('Sự kiện không hợp lệ');
      if (r.attendingCount > invitation.maxGuests) {
        throw new BadRequestException(`Tối đa ${invitation.maxGuests} khách`);
      }
    }

    const now = new Date();
    await this.prisma.$transaction(
      dto.responses.map((r) =>
        this.prisma.invitationEvent.update({
          where: {
            invitationId_eventId: {
              invitationId: invitation.id,
              eventId: r.eventId,
            },
          },
          data: {
            status: r.status,
            attendingCount:
              r.status === RsvpStatus.DECLINED ? 0 : r.attendingCount,
            message: r.message ?? null,
            respondedAt: now,
          },
        }),
      ),
    );
    return { ok: true };
  }

  @Get('guestbook')
  guestbook(): Promise<PublicGuestbookEntryData[]> {
    return this.prisma.guestbookEntry.findMany({
      where: { status: ModerationStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: publicGuestbookSelect,
    });
  }

  @Post('guestbook')
  async writeGuestbook(@Body() dto: GuestbookDto): Promise<OkResponse> {
    const invitation = dto.invitationCode
      ? await this.prisma.invitation.findUnique({
          where: { code: dto.invitationCode },
        })
      : null;
    await this.prisma.guestbookEntry.create({
      data: {
        authorName: dto.authorName.trim(),
        message: dto.message.trim(),
        invitationId: invitation?.id ?? null,
      },
    });
    return { ok: true, pending: true };
  }

  @Get('photos')
  async listPhotos(): Promise<PublicGalleryData> {
    const [albums, photos] = await Promise.all([
      this.prisma.album.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.photo.findMany({
        where: { status: ModerationStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);
    const withUrls = await this.photos.withUrls(photos);
    return {
      albums,
      photos: withUrls.map((p) => ({
        id: p.id,
        albumId: p.albumId,
        caption: p.caption,
        url: p.url,
      })),
    };
  }

  @Post('photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: config.uploadMaxBytes } }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GuestPhotoDto,
  ): Promise<OkResponse> {
    const invitation = await this.findInvitation(dto.invitationCode);
    const guestAlbum = await this.prisma.album.findFirst({
      where: { isGuest: true },
    });
    await this.photos.upload({
      file,
      caption: dto.caption,
      albumId: guestAlbum?.id ?? null,
      invitationId: invitation.id,
      status: ModerationStatus.PENDING,
    });
    return { ok: true, pending: true };
  }

  private async findInvitation(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
      include: {
        guests: true,
        events: {
          include: { event: true, table: true },
          orderBy: { event: { startAt: 'asc' } },
        },
      },
    });
    if (!invitation) throw new NotFoundException('Không tìm thấy thiệp mời');
    return invitation;
  }
}
