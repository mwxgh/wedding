import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import type { OkResponse } from '@repo/contracts';
import { ModerationStatus } from '@repo/db';
import type { Photo } from '@repo/db';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export interface UploadInput {
  file: Express.Multer.File | undefined;
  caption?: string;
  albumId?: string | null;
  invitationId?: string | null;
  status: ModerationStatus;
}

@Injectable()
export class PhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload({ file, caption, albumId, invitationId, status }: UploadInput) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext)
      throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG, WEBP, HEIC');

    const prefix = invitationId ? 'guests' : 'couple';
    const objectKey = `photos/${prefix}/${randomUUID()}.${ext}`;
    await this.storage.put(objectKey, file.buffer, file.mimetype);

    const photo = await this.prisma.photo.create({
      data: {
        objectKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        caption: caption || null,
        albumId: albumId || null,
        invitationId: invitationId || null,
        status,
      },
    });
    return this.withUrl(photo);
  }

  async remove(id: string): Promise<OkResponse> {
    const photo = await this.prisma.photo.delete({ where: { id } });
    await this.storage.remove(photo.objectKey).catch(() => undefined);
    return { ok: true };
  }

  async withUrl<T extends Photo>(photo: T): Promise<T & { url: string }> {
    return { ...photo, url: await this.storage.signedUrl(photo.objectKey) };
  }

  withUrls<T extends Photo>(photos: T[]): Promise<(T & { url: string })[]> {
    return Promise.all(photos.map((p) => this.withUrl(p)));
  }
}
