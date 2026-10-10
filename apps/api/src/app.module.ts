import { Module } from '@nestjs/common';

import { AdminController } from './admin/admin.controller';
import { EventsController } from './admin/events.controller';
import { FinanceController } from './admin/finance.controller';
import { InvitationsController } from './admin/invitations.controller';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PhotoModule } from './photos/photo.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicController } from './public/public.controller';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule, PhotoModule, AuthModule],
  controllers: [
    AppController,
    PublicController,
    AdminController,
    EventsController,
    InvitationsController,
    FinanceController,
  ],
})
export class AppModule {}
