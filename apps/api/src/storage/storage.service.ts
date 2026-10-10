import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = config.s3.bucket;
  private readonly client = new S3Client({
    endpoint: config.s3.endpoint(),
    region: config.s3.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.s3.accessKey(),
      secretAccessKey: config.s3.secretKey(),
    },
  });

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(`Storage not ready: ${(err as Error).message}`);
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  signedUrl(key: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      {
        expiresIn: SIGNED_URL_TTL_SECONDS,
      },
    );
  }
}
