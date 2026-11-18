import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes';

const STATUS_TO_CODE: Record<number, number> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  413: ErrorCode.PAYLOAD_TOO_LARGE,
  415: ErrorCode.UNSUPPORTED_MEDIA,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

/** 统一错误响应：{ code, message, data: null, requestId, details? }，5xx 不向客户端泄露内部信息 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCode.INTERNAL;
    let message = '服务器开小差了，请稍后再试';
    let details: unknown;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_TO_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL : ErrorCode.BAD_REQUEST);
      const body = exception.getResponse();
      if (typeof body === 'object' && body && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (Array.isArray(m)) {
          code = ErrorCode.VALIDATION_FAILED;
          message = '参数校验失败';
          details = m;
        } else if (typeof m === 'string') {
          message = m;
        }
      } else if (typeof body === 'string') {
        message = body;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      code = ErrorCode.NOT_FOUND;
      message = '资源不存在';
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId: req.id, path: req.url }, '未处理的异常');
    }

    res.status(status).json({ code, message, data: null, requestId: req.id, ...(details ? { details } : {}) });
  }
}
