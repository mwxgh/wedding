import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { PrismaClient, createAdapter } from '@repo/db';

import { config } from '../config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter(config.databaseUrl()) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
