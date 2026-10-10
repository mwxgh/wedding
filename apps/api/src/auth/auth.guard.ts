import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { Request } from 'express';

export interface AdminPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { admin?: AdminPayload }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      req.admin = await this.jwt.verifyAsync<AdminPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
