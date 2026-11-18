import { HttpStatus, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { AppConfig } from '../../config/app-config.service';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        storage: memoryStorage(),
        limits: { fileSize: config.get('UPLOAD_MAX_MB') * 1024 * 1024, files: 9 },
        fileFilter: (_req, file, cb) =>
          ALLOWED.has(file.mimetype)
            ? cb(null, true)
            : cb(
                new BusinessException(
                  ErrorCode.UNSUPPORTED_MEDIA,
                  '仅支持 JPG/PNG/WEBP 图片',
                  HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ),
                false,
              ),
      }),
    }),
  ],
  controllers: [WorksController],
  providers: [WorksService],
})
export class WorksModule {}
