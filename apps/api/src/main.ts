import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { PrismaExceptionFilter } from '@repo/db/nest';

import { AppModule } from './app.module';
import { config } from './config';

// Gift amounts are BigInt; serialize them as strings in JSON
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: config.webOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.port);
}
void bootstrap();
