import { Module } from '@nestjs/common';

import { PrismaModule } from '@repo/db/nest';

import { AdminController } from './admin/admin.controller';
import { EventsController } from './admin/events.controller';
import { FinanceController } from './admin/finance.controller';
import { InvitationsController } from './admin/invitations.controller';
import { PlanController } from './admin/plan.controller';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { PayosModule } from './payos/payos.module';
import { PhotoModule } from './photos/photo.module';
import { PublicController } from './public/public.controller';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    PrismaModule.forRoot({ url: config.databaseUrl() }),
    StorageModule,
    PhotoModule,
    AuthModule,
    PayosModule,
  ],
  controllers: [
    AppController,
    PublicController,
    AdminController,
    EventsController,
    InvitationsController,
    FinanceController,
    PlanController,
  ],
})
export class AppModule {}
