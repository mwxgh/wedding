import { type DynamicModule, Global, Module } from '@nestjs/common';

import {
  PRISMA_OPTIONS,
  type PrismaModuleOptions,
  PrismaService,
} from './prisma.service.js';

/** Global `PrismaService`: `PrismaModule.forRoot({ url: config.databaseUrl() })`. */
@Global()
@Module({})
export class PrismaModule {
  static forRoot(options: PrismaModuleOptions): DynamicModule {
    return {
      module: PrismaModule,
      providers: [
        { provide: PRISMA_OPTIONS, useValue: options },
        PrismaService,
      ],
      exports: [PrismaService],
    };
  }
}
