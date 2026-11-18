import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import type { Request } from 'express';
import { map } from 'rxjs';
import { ErrorCode } from '../exceptions/error-codes';

/** 成功响应统一包装为 { code: 0, message: 'ok', data, requestId } */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    return next.handle().pipe(
      map((data) =>
        data instanceof StreamableFile
          ? data
          : { code: ErrorCode.OK, message: 'ok', data: data ?? null, requestId: req.id },
      ),
    );
  }
}
