import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import bcrypt from 'bcryptjs';

import type { LoginRequest, LoginResponse } from '@repo/contracts';
import { EmailField, StringField } from '@repo/validation';

import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard, type AdminPayload } from './auth.guard';

class LoginDto implements LoginRequest {
  @EmailField() email: string;
  @StringField({ minLength: 1, trim: false }) password: string;
}

@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }
    const payload: AdminPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      email: user.email,
    };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() req: { admin: AdminPayload }): { id: string; email: string } {
    return { id: req.admin.sub, email: req.admin.email };
  }
}
