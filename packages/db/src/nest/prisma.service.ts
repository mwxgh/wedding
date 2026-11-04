import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';

import { PrismaClient } from '../generated/prisma/client.js';
import { createAdapter } from '../index.js';

export const PRISMA_OPTIONS = Symbol('PRISMA_OPTIONS');

export interface PrismaModuleOptions {
  /** mysql:// connection string */
  url: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(PRISMA_OPTIONS) options: PrismaModuleOptions) {
    super({ adapter: createAdapter(options.url) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
