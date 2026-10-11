import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  type AdminAlbumData,
  type AdminGuestbookEntryData,
  type AdminPhotoData,
  type DashboardData,
  type OkResponse,
  adminAlbumInclude,
  adminGuestbookInclude,
  adminPhotoInclude,
  atVn,
  vnDay,
} from '@repo/contracts';
import {
  type Album,
  type GuestbookEntry,
  ModerationStatus,
  type Photo,
  RsvpStatus,
  type WeddingInfo,
} from '@repo/db';

import { AdminGuard } from '../auth/auth.guard';
import { config } from '../config';
import { PhotoService } from '../photos/photo.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AlbumDto,
  ModerationDto,
  PhotoUploadDto,
  ScheduleDto,
  UpdatePhotoDto,
  WeddingInfoDto,
} from './admin.dto';
import { applySchedule } from './schedule';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotoService,
  ) {}

  @Get('dashboard')
  async dashboard(): Promise<DashboardData> {
    const [invitations, events, guestbookPending, photosPending, gifts] =
      await Promise.all([
        this.prisma.invitation.findMany({
          select: {
            side: true,
            relation: true,
            maxGuests: true,
            openedAt: true,
            events: {
              select: {
                eventId: true,
                status: true,
                attendingCount: true,
                respondedAt: true,
                tableId: true,
              },
            },
          },
        }),
        this.prisma.event.findMany({
          orderBy: { startAt: 'asc' },
          include: { tables: { select: { capacity: true } } },
        }),
        this.prisma.guestbookEntry.count({
          where: { status: ModerationStatus.PENDING },
        }),
        this.prisma.photo.count({
          where: { status: ModerationStatus.PENDING },
        }),
        this.prisma.gift.groupBy({
          by: ['method'],
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

    const replies = invitations.flatMap((i) => i.events);
    const eventStats = events.map((e) => {
      const rows = replies.filter((r) => r.eventId === e.id);
      const count = (s: RsvpStatus) =>
        rows.filter((r) => r.status === s).length;
      const attending = rows.filter((r) => r.status === RsvpStatus.ATTENDING);
      return {
        id: e.id,
        name: e.name,
        startAt: e.startAt,
        invited: rows.length,
        attending: attending.length,
        declined: count(RsvpStatus.DECLINED),
        maybe: count(RsvpStatus.MAYBE),
        pending: count(RsvpStatus.PENDING),
        headcount: attending.reduce((n, r) => n + r.attendingCount, 0),
        seated: attending
          .filter((r) => r.tableId)
          .reduce((n, r) => n + r.attendingCount, 0),
        capacity: e.tables.reduce((n, t) => n + t.capacity, 0),
      };
    });

    // first RSVP of each invitation, and first open, bucketed per day
    const firstReply = invitations
      .map(
        (i) =>
          i.events
            .map((e) => e.respondedAt)
            .filter((d): d is Date => !!d)
            .sort((a, b) => a.getTime() - b.getTime())[0],
      )
      .filter((d): d is Date => !!d);
    const opens = invitations
      .map((i) => i.openedAt)
      .filter((d): d is Date => !!d);

    const group = <K extends string>(
      key: (i: (typeof invitations)[0]) => K,
    ) => {
      const map = new Map<K, { invitations: number; guests: number }>();
      for (const i of invitations) {
        const g = map.get(key(i)) ?? { invitations: 0, guests: 0 };
        g.invitations += 1;
        g.guests += i.maxGuests;
        map.set(key(i), g);
      }
      return [...map.entries()].sort((a, b) => b[1].guests - a[1].guests);
    };

    return {
      invitations: {
        total: invitations.length,
        opened: opens.length,
        responded: firstReply.length,
        guests: invitations.reduce((n, i) => n + i.maxGuests, 0),
      },
      events: eventStats,
      timeline: dailyTimeline(opens, firstReply),
      byRelation: group((i) => i.relation).map(([relation, g]) => ({
        relation,
        ...g,
      })),
      bySide: group((i) => i.side).map(([side, g]) => ({ side, ...g })),
      guestbookPending,
      photosPending,
      gifts: {
        count: gifts.reduce((n, g) => n + g._count._all, 0),
        totalAmount: gifts.reduce((n, g) => n + (g._sum.amount ?? 0n), 0n),
        byMethod: gifts
          .map((g) => ({
            method: g.method,
            count: g._count._all,
            amount: g._sum.amount ?? 0n,
          }))
          .sort((a, b) => Number(b.amount - a.amount)),
      },
    };
  }

  // --- Wedding info
  @Get('wedding')
  wedding(): Promise<WeddingInfo | null> {
    return this.prisma.weddingInfo.findUnique({ where: { id: 1 } });
  }

  /**
   * Saves names and texts. The date is only taken on the first save; after
   * that it changes through `PUT schedule` so events follow it.
   */
  @Put('wedding')
  async saveWedding(@Body() dto: WeddingInfoDto): Promise<WeddingInfo> {
    const { weddingDate, ...data } = dto;
    const exists = await this.prisma.weddingInfo.findUnique({
      where: { id: 1 },
      select: { id: true },
    });
    if (exists)
      return this.prisma.weddingInfo.update({ where: { id: 1 }, data });
    if (!weddingDate) throw new BadRequestException('Thiếu ngày cưới');
    return this.prisma.weddingInfo.create({
      data: { id: 1, ...data, weddingDate: atVn(vnDay(weddingDate)) },
    });
  }

  /**
   * The wedding day and every event's time in one save. Event timestamps,
   * open task and expense due dates all follow the day.
   */
  @Put('schedule')
  saveSchedule(@Body() dto: ScheduleDto): Promise<{ rescheduled: number }> {
    return this.prisma.$transaction(async (tx) => ({
      rescheduled: await applySchedule(tx, dto.weddingDate, dto.events),
    }));
  }

  // --- Guestbook moderation
  @Get('guestbook')
  guestbook(
    @Query('status') status?: ModerationStatus,
  ): Promise<AdminGuestbookEntryData[]> {
    return this.prisma.guestbookEntry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: adminGuestbookInclude,
    });
  }

  @Patch('guestbook/:id')
  moderateGuestbook(
    @Param('id') id: string,
    @Body() dto: ModerationDto,
  ): Promise<GuestbookEntry> {
    return this.prisma.guestbookEntry.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  @Delete('guestbook/:id')
  async deleteGuestbook(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.guestbookEntry.delete({ where: { id } });
    return { ok: true };
  }

  // --- Albums & photos
  @Get('albums')
  albums(): Promise<AdminAlbumData[]> {
    return this.prisma.album.findMany({
      orderBy: { sortOrder: 'asc' },
      include: adminAlbumInclude,
    });
  }

  @Post('albums')
  createAlbum(@Body() dto: AlbumDto): Promise<Album> {
    return this.prisma.album.create({ data: dto });
  }

  @Delete('albums/:id')
  async deleteAlbum(@Param('id') id: string): Promise<OkResponse> {
    await this.prisma.album.delete({ where: { id } });
    return { ok: true };
  }

  @Get('photos')
  async listPhotos(
    @Query('status') status?: ModerationStatus,
  ): Promise<AdminPhotoData[]> {
    const photos = await this.prisma.photo.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: adminPhotoInclude,
    });
    return this.photos.withUrls(photos);
  }

  @Post('photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: config.uploadMaxBytes } }),
  )
  uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PhotoUploadDto,
  ): Promise<Photo & { url: string }> {
    return this.photos.upload({
      file,
      caption: dto.caption,
      albumId: dto.albumId,
      status: ModerationStatus.APPROVED,
    });
  }

  @Patch('photos/:id')
  updatePhoto(
    @Param('id') id: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<Photo> {
    return this.prisma.photo.update({ where: { id }, data: dto });
  }

  @Delete('photos/:id')
  deletePhoto(@Param('id') id: string): Promise<OkResponse> {
    return this.photos.remove(id);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Daily counts in Vietnam time, zero-filled: the last 30 days, extended back
 * to the first activity (at most 90 days) so the whole campaign is visible.
 */
function dailyTimeline(opens: Date[], replies: Date[]) {
  const now = Date.now();
  const first = Math.min(now, ...opens.map(Number), ...replies.map(Number));
  const span = Math.min(89, Math.max(29, Math.ceil((now - first) / DAY_MS)));
  const days = new Map<string, { opened: number; responded: number }>();
  for (let i = span; i >= 0; i--) {
    days.set(vnDay(new Date(now - i * DAY_MS)), { opened: 0, responded: 0 });
  }
  for (const d of opens) {
    const day = days.get(vnDay(d));
    if (day) day.opened += 1;
  }
  for (const d of replies) {
    const day = days.get(vnDay(d));
    if (day) day.responded += 1;
  }
  return [...days.entries()].map(([date, v]) => ({ date, ...v }));
}
