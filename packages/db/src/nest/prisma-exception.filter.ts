import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';

interface JsonResponse {
  status(code: number): { json(body: unknown): unknown };
}

const STATUS_BY_CODE: Record<string, [HttpStatus, string]> = {
  P2025: [HttpStatus.NOT_FOUND, 'Không tìm thấy dữ liệu'],
  P2002: [HttpStatus.CONFLICT, 'Dữ liệu bị trùng'],
  P2003: [HttpStatus.BAD_REQUEST, 'Dữ liệu liên kết không hợp lệ'],
  // e.g. a malformed id for a uuid column (Postgres 22P02)
  P2007: [HttpStatus.BAD_REQUEST, 'Dữ liệu không hợp lệ'],
};

/** Known Prisma errors → 404/409/400; any other Prisma error → 500. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const [status, message] = STATUS_BY_CODE[err.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cơ sở dữ liệu',
    ];
    host
      .switchToHttp()
      .getResponse<JsonResponse>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
