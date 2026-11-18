import { resolve } from 'node:path';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { AppConfig } from './config/app-config.service';

/** 应用级配置集中在这里，main.ts 与 e2e 测试共用，保证测试环境与线上一致 */
export function configureApp(app: NestExpressApplication, config: AppConfig) {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  // 本地存储的静态访问；生产环境建议交给 Nginx/CDN
  app.useStaticAssets(resolve(config.get('UPLOAD_DIR')), {
    prefix: config.get('PUBLIC_UPLOAD_BASE'),
    index: false,
    maxAge: '30d',
    immutable: true,
  });
  app.enableShutdownHooks();
}
