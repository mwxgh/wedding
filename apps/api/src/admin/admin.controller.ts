import {
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
  UpdatePhotoDto,
  WeddingInfoDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotoService,
  ) {}

  @Get('dashboard')
  async dashboard(): Promise<DashboardData> {
    const [
      invitations,
      opened,
      events,
      rsvps,
      guestbookPending,
      photosPending,
      gifts,
    ] = await Promise.all([
      this.prisma.invitation.count(),
      this.prisma.invitation.count({ where: { openedAt: { not: null } } }),
      this.prisma.event.findMany({ orderBy: { startAt: 'asc' } }),
      this.prisma.invitationEvent.groupBy({
        by: ['eventId', 'status'],
        _count: { _all: true },
        _sum: { attendingCount: true },
      }),
      this.prisma.guestbookEntry.count({
        where: { status: ModerationStatus.PENDING },
      }),
      this.prisma.photo.count({ where: { status: ModerationStatus.PENDING } }),
      this.prisma.gift.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      invitations: { total: invitations, opened },
      events: events.map((e) => {
        const rows = rsvps.filter((r) => r.eventId === e.id);
        const count = (s: RsvpStatus) =>
          rows.find((r) => r.status === s)?._count._all ?? 0;
        return {
          id: e.id,
          name: e.name,
          startAt: e.startAt,
          invited: rows.reduce((n, r) => n + r._count._all, 0),
          attending: count(RsvpStatus.ATTENDING),
          declined: count(RsvpStatus.DECLINED),
          maybe: count(RsvpStatus.MAYBE),
          pending: count(RsvpStatus.PENDING),
          headcount: rows
            .filter((r) => r.status === RsvpStatus.ATTENDING)
            .reduce((n, r) => n + (r._sum.attendingCount ?? 0), 0),
        };
      }),
      guestbookPending,
      photosPending,
      gifts: {
        count: gifts._count._all,
        totalAmount: gifts._sum.amount ?? 0n,
      },
    };
  }

  // --- Wedding info
  @Get('wedding')
  wedding(): Promise<WeddingInfo | null> {
    return this.prisma.weddingInfo.findUnique({ where: { id: 1 } });
  }

  @Put('wedding')
  saveWedding(@Body() dto: WeddingInfoDto): Promise<WeddingInfo> {
    const data = { ...dto, weddingDate: new Date(dto.weddingDate) };
    return this.prisma.weddingInfo.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
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
