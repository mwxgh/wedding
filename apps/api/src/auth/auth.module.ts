import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { config } from '../config';
import { AuthController } from './auth.controller';
import { AdminGuard } from './auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: config.jwt.secret(),
        signOptions: { expiresIn: config.jwt.expiresIn as `${number}d` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AdminGuard],
  exports: [AdminGuard, JwtModule],
})
export class AuthModule {}
