import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

import type { Response } from 'express';

import { Prisma } from '@repo/db';

const STATUS_BY_CODE: Record<string, [HttpStatus, string]> = {
  P2025: [HttpStatus.NOT_FOUND, 'Không tìm thấy dữ liệu'],
  P2002: [HttpStatus.CONFLICT, 'Dữ liệu bị trùng'],
  P2003: [HttpStatus.BAD_REQUEST, 'Dữ liệu liên kết không hợp lệ'],
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const [status, message] = STATUS_BY_CODE[err.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cơ sở dữ liệu',
    ];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
