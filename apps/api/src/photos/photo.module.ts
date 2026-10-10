import { Global, Module } from '@nestjs/common';

import { PhotoService } from './photo.service';

@Global()
@Module({
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}
